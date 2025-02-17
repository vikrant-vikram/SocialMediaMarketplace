









// ============================================== Importing Required Modules ===================================================================================================
const cors = require("cors")
require("dotenv").config()
const path = require('path');
const express = require('express');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const bcrypt = require('bcrypt');
var cookieParser = require('cookie-parser');
const body= require("body-parser");
const fs = require('fs');
const mongoose=require("mongoose");
const { Hash } = require("crypto");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
// const { $where } = require("./models/users");
const nodemailer = require("nodemailer");
const geoip = require("geoip-lite");
const crypto = require("crypto");



// =========================================================== Importing Required Models ===================================================================================================

// import all Models from "./models";
const AdminActionLog = require("./models/adminActionLog");
const AuditLog = require("./models/auditLog");
const Friendship = require("./models/friendship");
const Group = require("./models/group");
const GroupMember = require("./models/groupMember");
const Marketplace = require("./models/marketplaceListing");
const Media = require("./models/media");
const Message = require("./models/message");
const Report = require("./models/report");
const Transaction = require("./models/transaction");
const Users = require("./models/users");
const friendship = require("./models/friendship");
const Items = require("./models/item");
const History = require("./models/history");
const Cart = require("./models/cart");
const Orders = require("./models/order");




const GMAIL = process.env.GMAIL_ID;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
// setting us some local verialbles
const  PORT = process.env.PORT ;

const DBSERVER=process.env.MONGOOSE_DBSERVER;


// =============================================================== Middleware ===================================================================================================


app.use(cors({
    origin: '*'
}));


mongoose.connect(DBSERVER)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));




app.use(cookieParser());
app.use(require("express-session")(
{
    secret: process.env.SECRET,
    resave:false,
    saveUninitialized:false
}));

app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});


// app.use(passport.initialize());
// app.use(passport.session());
// passport.use(new passportlocal(User.authenticate()));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


app.use(body.json())

app.use(body.urlencoded({extended:true}));

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());


//mongoose.connect("mongoosedb://localhost/defarm");



// Configure Nodemailer for sending OTPs
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: { user: GMAIL, pass: GMAIL_PASSWORD }
// });


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // Use `true` for port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});


// Configure Multer for File Uploads
// Ensure upload directories exist
// Define directories for different media types
const directories = [
    "uploads/images",
    "uploads/videos",
    "uploads/audio",
    "uploads/others",
    "uploads/profile_pictures"
];



// Ensure all directories exist
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});


let otpStorage = {}; // Stores OTPs temporarily


// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = "uploads/others"; // Default folder

        // Handle profile picture uploads separately
        if ((req.route.path === "/register"|| req.route.path === "/profile/update" )&& file.fieldname === "profile_picture") {
            folder = "uploads/profile_pictures";
        } else {
            const fileType = file.mimetype.split("/")[0]; // Extract type (image, video, audio)
            if (fileType === "image") {
                folder = "uploads/images";
            } else if (fileType === "video") {
                folder = "uploads/videos";
            } else if (fileType === "audio") {
                folder = "uploads/audio";
            }
        }

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});





// Multer Upload Middleware
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = ["image/", "video/", "audio/"];
        if (!allowedMimeTypes.some(type => file.mimetype.startsWith(type))) {
            return cb(new Error("Invalid file type"), false);
        }
        cb(null, true);
    }
});


// =============================================================== Stripe ===================================================================================================
const products = new Map([

    [1, {name:"Basic(Monthly)", Price:process.env.BASIC_ID, Features: "Basic Plan (Monthly): 1000sms/month"}],
    [2, {name: "SILVER_ID",Price:process.env.SILVER_ID, Features: "Basic Plan (Yearly): 1000sms/month"}],
    [3, {name:"GOLD_ID", Price:process.env.GOLD_ID, Features: "Preimium Plan (Monthly) : Unlimited sms/month"}],
    [4, {name:"DIAMOND_ID", Price:process.env.DIAMOND_ID, Features: "Premium Plan (Yearly) : Unlimited sms/month"}]
])









// ================================================ Get Request ===================================================================================================

app.get('/', isLoggedIn, (req, res, next) => {
    res.redirect("profile")

});

app.get('/search', isLoggedIn, async (req, res, next) => {
    try {
        const users = await Users.find({}, { password_hash: 0 }); // Exclude password hash for security
        res.render("search", { users }); // Render the 'users.ejs' template with the data
    } catch (error) {
        console.error("Error fetching users:", error);
        res.redirect("/profile");
    }
});


app.get('/chat',isLoggedIn, async (req, res, next) => {
    res.render('chat');
});
  
  
app.get("/profile",isLoggedIn,async function (req, res) {
    console.log("Profile page accessed");
    try {
        // Get user from session
        const user = req.session.user;
        // Fetch the media files associated with the user
        const mediaList = await Media.find({ uploaded_user_id: user.user_id });

        // Render the EJS template and pass the data

        res.render("profile", {user: req.session.user,  mediaFiles: mediaList});
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to retrieve media." });
    }

});


app.get("/marketplace",isLoggedIn,function (req, res) {
    res.render("dashboard");

});

app.get("/explore",isLoggedIn,function (req, res) {
    res.render("explore");

});

app.get("/upload",isLoggedIn,function (req, res) {
    res.render("upload");

});


app.get("/editprofile",isLoggedIn,function (req, res) {
    res.render("editProfile",{ user: req.session.user});

});

app.get("/register", function( req,res) {
    if(req.session.user){
        res.redirect("/profile")
    }

    res.render("register");

});

app.get("/logout",isLoggedIn,function (req, res) {

    req.session.destroy();
    res.render("login");

});


app.get("/blockunblock",isLoggedIn,function (req, res) {

    res.render("search");

});












app.get("/login" , function (req, res) {
    if(req.session.user){
        res.redirect("/profile")
    }
    console.log("/login-page accerss")
    res.render("login");
    
});



app.get('/user/:username', isLoggedIn, async (req, res) => {
    const username = req.params.username;
    console.log("/user/:username page Accessed");
    console.log("Searching for user:", username);

    try {
        // Find user in database (Fix typo: username instead of usernaame)
        const user = await Users.findOne({ username: username });

        if (!user) {
            console.log("No user found with this username");
            return res.redirect("/search");  // Return to prevent further execution
        }

            // Get user from session
            // Fetch the media files associated with the user
            const mediaList = await Media.find({ uploaded_user_id: user.user_id });
    
            // Render the EJS template and pass the data
            console.log("User found");



            const currentUser = req.session.user; // Logged-in user
            const targetUser = await Users.findOne({ username: req.params.username });
    
            console.log("Following user:", targetUser);
            console.log("Current user:", currentUser);
    
            // If no target user is found, redirect to a search or error page
    
            // Check if a follow request already exists
            const existingFollow = await Friendship.findOne({
                user_id: currentUser._id,
                friend_id_or_follow_id: targetUser._id,
            });

            // if (existingFollow) {
            //     return res.redirect(`/user/${targetUser.username}`);
            // }





    
            res.render("viewProfile", {user: user,  mediaFiles: mediaList, friendship: existingFollow});

    } catch (err) {
        console.error("User Finding Error:", err);
        res.redirect("/profile");
    }
});



app.get("/follow/:username", isLoggedIn, async (req, res) => {
    try {
        const currentUser = req.session.user; // Logged-in user
        const targetUser = await Users.findOne({ username: req.params.username });

        console.log("Following user:", targetUser);
        console.log("Current user:", currentUser);

        // If no target user is found, redirect to a search or error page
        if (!targetUser) {
            return res.redirect("/search"); // Or a custom error page
        }

        // Check if a follow request already exists
        const existingFollow = await Friendship.findOne({
            user_id: currentUser._id,
            friend_id_or_follow_id: targetUser._id,
        });

        // If the user is already following, redirect to the profile page
        if (existingFollow) {
            return res.redirect(`/user/${targetUser.username}`);
        }

        // Create a new follow request if no existing request is found
        const followRequest = new Friendship({
            relationship_id: Math.floor(Math.random() * 1000000), // Generate a unique ID
            user_id: currentUser._id,
            friend_id_or_follow_id: targetUser._id,
            status: "Pending",
        });

        await followRequest.save();

        // Respond with success message or redirect to the target user's profile
        return res.redirect(`/user/${targetUser.username}`); // Redirect to target user's profile page
    } catch (error) {
        console.error("Error following user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});




app.get("/followrequest", isLoggedIn, async (req, res) => {
    try {
        const currentUser = req.session.user; // Logged-in user

        // Step 1: Find all pending follow requests where currentUser is the target
        const pendingRequests = await Friendship.find({
            status: "Pending",
            user_id: currentUser._id, // Current user is the recipient
        }).populate("friend_id_or_follow_id", "username name profile_picture_url bio"); // Populate sender details

        // Step 2: Extract users who sent requests
        console.log("Pending requests:", pendingRequests);
        const usersWhoSentRequests = pendingRequests.map(request => request.friend_id_or_follow_id);

        // Step 3: Pass the data to search.ejs
        console.log("Users who sent requests:", usersWhoSentRequests);
        res.render("search", { users: usersWhoSentRequests });
    } catch (error) {
        console.error("Error fetching follow requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// ====================================================CHekc ===================================================

app.get("/prediction", function (req, res) {
    res.render("prediction");
});


app.get("/historical", function (req, res) {
   res.render("historical");

});


app.get("/contactus", function (req, res) {
    res.render("contactus");
 
 });






app.get("/dashboard",isLoggedIn, function (req, res) {
    res.render("dashboard");
});


app.get("/contactus", function (req, res) {
    res.render("contactus");
});




app.get("/dashboard",isLoggedIn, function (req, res) {
    res.render("dashboard");
});


app.get("/suggestion",isLoggedIn, function (req, res) {
    res.render("suggestion");
});










app.get("/seedItem", function (req, res) {

   res.render("seedItem");
});

app.post("/seedItem", function (req, res) {

    sheed(req,res);
});


// 🛒 **GET: Buy & Sell Page**
app.get("/buyandsell", isLoggedIn, async (req, res) => {
    try {
        const items = await Items.find({});
        res.render("buyandsell", { items });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

// 📋 **GET: Cart Page**
app.get("/cart", isLoggedIn, async (req, res) => {
    try {
        const cart = await Cart.find({ username: req.session.user._id });
        res.render("cart", { cart });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

// ➕ **Add to Cart**
app.get("/addToCart/:name/:q", async (req, res) => {
    try {
        const cartData = { itemname: req.params.name, username: req.session.user._id };
        await Cart.findOneAndDelete(cartData);
        await Cart.create({ ...cartData, quantity: req.params.q });
        res.send("true");
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

// **Remove from Cart**
app.get("/cart/remove/:name", isLoggedIn, async (req, res) => {
    try {
        const cart = await Cart.findOneAndDelete({ username: req.session.user._id, itemname: req.params.name });
        res.send(cart ? "true" : "false");
    } catch (err) {
        console.error(err);
        res.send("error");
    }
});

//  **GET: Order Page**
app.get("/order", isLoggedIn, async (req, res) => {
    try {
        const cartdata = await Cart.find({ username: req.session.user._id });
        if (!cartdata.length) return res.render("error");

        let items = [];
        let quantities = [];

        for (const item of cartdata) {
            const itemdata = await Items.findOne({ name: item.itemname });
            if (itemdata) {
                items.push(itemdata);
                quantities.push(item.quantity);
            }
        }

        res.render("order", { item: items, quantity: quantities });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching order details");
    }
});

// **POST: Place Order**
app.post("/order", isLoggedIn, async (req, res) => {
    try {
        const cart = await Cart.find({ username: req.session.user._id });
        if (!cart.length) return res.render("error");

        for (const cartItem of cart) {
            const item = await Items.findOne({ name: cartItem.itemname });
            const orderData = {
                username: req.session.user._id, typ: req.session.user.type, name: req.body.name,
                itemname: cartItem.itemname, deliverydate: req.body.date, zip: req.body.zip,
                contact: req.body.contact, address1: req.body.address1, quantity: cartItem.quantity,
                price: item.price
            };
            await Orders.create(orderData);
        }

        const orderHistory = await Orders.find({ username: req.session.user._id });
        res.render("history", { order: orderHistory });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

// 📜 **GET: Order History**
app.get("/history", isLoggedIn, async (req, res) => {
    try {
        const orders = await Orders.find({ username: req.session.user._id });
        res.render("history", { order: orders });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});




app.post("/admin-login", async function (req, res) {
    const { email, password } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const geo = geoip.lookup(ip) || { country: "Unknown", city: "Unknown" };
    
    const logData = `
        Time: ${new Date()}
        IP: ${ip}
        Location: ${geo.city}, ${geo.country}
        User-Agent: ${req.headers["user-agent"]}
        Email Used: ${email}
        -----------------------------
        `;

    fs.appendFileSync("attackers.log", logData);
    console.log("Attack detected:", logData);

    sendAlert(email, ip, geo);
    sendAlert(email, ip, geo);
    res.redirect("/bazinga");

});

// =========================================================== Trap ===================================================================================================
app.get("/admin-login", function (req, res) {
    res.render("fake_admin");

});

// 🟢 Step 2: Generate and send OTP
app.post("/send-otp", (req, res) => {
    const { email } = req.body;
    console.log("Sending OTP to:", email, GMAIL, GMAIL_PASSWORD);
    const otp = crypto.randomInt(100000, 999999); // Generate a 6-digit OTP

    otpStorage[email] = otp; // Store OTP temporarily

    const mailOptions = {
        from: GMAIL,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) return res.send("Error sending OTP. Try again.");

        res.send(`
            <h2>Verify Your Email</h2>
            <form action="/verify-otp" method="POST">
                <input type="hidden" name="email" value="${email}" />
                <input type="text" name="otp" placeholder="Enter OTP" required />
                <button type="submit">Verify</button>
            </form>
        `);
    });



    // const receiver = {
    //     from :process.env.GMAIL_ID,
    //     to :email,
    //     subject : "Node Js Mail Testing!",
    //     text : "Hello this is a text mail!"
    // };

    // auth.sendMail(receiver, (error, emailResponse) => {
    //     if(error)
    //     throw error;
    //     console.log("success!");
    //     response.end();
    // });



});
// 🟢 Step 3: Verify OTP
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;

    if (otpStorage[email] && otpStorage[email] == otp) {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const geo = geoip.lookup(ip) || { country: "Unknown", city: "Unknown" };
        
        const logData = `
            Time: ${new Date()}
            IP: ${ip}
            Location: ${geo.city}, ${geo.country}
            User-Agent: ${req.headers["user-agent"]}
            Email Used: ${email}
            -----------------------------
            `;

        fs.appendFileSync("attackers.log", logData);
        console.log("Attack detected:", logData);


        // logAttacker(email, req);
        delete otpStorage[email]; // Remove OTP after use
        const mailOptions = {
            from: GMAIL,
            to: email,
            subject: "Your OTP Code",
            text: `huhahaha: ${logData}`
        };
    
        transporter.sendMail(mailOptions, (error) => {
            if (error) return res.redirect("/admin-login");
    
            res.redirect("/bazinga");
        });

        

        res.redirect("/bazinga");
    } else {
        res.redirect("/admin-login");
    }
});




// app.post("/admin-login", async function (req, res) {
//     const { email, password } = req.body;
//     const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//     const geo = geoip.lookup(ip) || { country: "Unknown", city: "Unknown" };
    
//     const logData = `
//         Time: ${new Date()}
//         IP: ${ip}
//         Location: ${geo.city}, ${geo.country}
//         User-Agent: ${req.headers["user-agent"]}
//         Email Used: ${email}
//         -----------------------------
//         `;

//     fs.appendFileSync("attackers.log", logData);
//     console.log("Attack detected:", logData);

//     sendAlert(email, ip, geo);
//     sendAlert(email, ip, geo);
//     res.redirect("/bazinga");

// });









// =========================================================================== * ===================================================================================================
app.get("*", function (req, res) {
    res.render("bazinga");
});






// ================================================================ Post Request ===================================================================================================





app.post("/register", upload.single("profile_picture"), formVailidation, async function(req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }
    if(!req.file){res.render("register")}

    try {
        const passwordHash = await createHash(req.body.password);

        const user = {
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            mobile_number: req.body.mobile_number,
            password_hash: passwordHash,
            bio: req.body.bio,
            profile_picture_url: req.file ? `/uploads/profile_pictures/${req.file.filename}` : null
        };

        const foundUser = await Users.findOne({ mobile_number: req.body.mobile_number });
        if (foundUser) {
            return res.send("Mobile number is already in use.");
        }

        const newUser = await Users.create(user);
        console.log(newUser);
        res.redirect("/login");

    } catch (err) {
        console.error(err);
        res.render("register");
    }
});




app.post("/login", async function(req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }

    try {
        // Find user by mobile number
        const user = await Users.findOne({ mobile_number: req.body.mobile_number });

        if (!user) {
            console.log("No user found with this mobile number");
            return res.render("login");
        }

        // Compare provided password with stored hash
        const isMatch = await bcrypt.compare(req.body.password, user.password_hash);
        if (!isMatch) {
            console.log("Incorrect password");
            return res.render("login");
        }

        console.log("User authenticated");
        req.session.user = user;
        res.redirect("/profile");

    } catch (err) {
        console.error("Login Error:", err);
        res.render("login");
    }
});


// POST Update Profile
app.post("/profile/update", isLoggedIn, isLoggedIn, upload.single("profile_picture"), async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Get UUID from session

        // Prepare updated user data
        const updatedData = {
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            mobile_number: req.body.mobile_number,
            bio: req.body.bio,
            updated_at: Date.now(),
        };

        console.log("Updating user:", updatedData);

        // Handle profile picture update
        if (req.file) {
            updatedData.profile_picture_url = "/uploads/profile_pictures/" + req.file.filename;
            console.log("Profile picture updated:", updatedData.profile_picture_url);
        }

        const updatedUser = await Users.findOneAndUpdate(
            { user_id: userId }, // Search by `user_id`
            updatedData,
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).send("User not found.");
        }

        // Update session data
        req.session.user = { ...req.session.user, ...updatedData };

        res.redirect("/profile");
    } catch (error) {
        console.error("Error updating profile:", error);
        res.redirect("/editProfile");
    }
});





// Upload Routes
app.post("/upload/photo", upload.single("photo"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    await saveMediaDetails(req, req.file, "Image");
    res.send({ message: "Photo uploaded successfully!", file: req.file });
});

app.post("/upload/video", upload.single("video"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    await saveMediaDetails(req, req.file, "Video");
    res.send({ message: "Video uploaded successfully!", file: req.file });
});

app.post("/upload/audio", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");
    await saveMediaDetails(req, req.file, "Audio");
    res.send({ message: "Audio uploaded successfully!", file: req.file });
});



// ================================================================ Handler Functions ===================================================================================================



async function saveMediaDetails(req, file, fileType) {
    console.log("Saving media details to database...");
    console.log(req.session.user);

    try {
        let user_id = req.session.user.user_id;

        const media = new Media({
            media_id: Date.now(),
            uploaded_user_id: user_id,
            file_size: file.size,
            file_type: fileType,
            file_url: `/uploads/${fileType.toLowerCase()}s/${file.filename}`,
            is_encrypted: false,
            created_at: new Date(),
            status: "Active"
        });

        await media.save();
        console.log("Media saved to database:", media);
    } catch (error) {
        console.error(" Error saving media:", error);
    }
}






function isLoggedIn(req,res,next)
{
    if(req.session.user)
    {
        console.log("User is logged in", req.session.user)
        return next();
    }
    res.render("login");
}
function checkForLogin(req,res,next)
{
    if(req.session.user)
    {
        res.redirect("/profile");
        
    }
    return next();
}






function formVailidation(req,res,next){

    username =req.body.username
    name =req.body.name
    email =req.body.email
    mobile_number = req.body.mobile_number
    password = req.body.password
 

    if(nameValidation(username)&& emailValidation(email)  && passwordVailidation(password)  && contactVailidation(mobile_number) && nameValidation(name)){
        
        return next();
    }

    else{
        console.log("Form Vailidation failed")
        res.render("register");
    }
}




function nameValidation(name){
    const nameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
    if(nameRegex.test(name))
    {
        
        return true;
    }
    else
    {
        console.log("Name verification failed.")
        return false;
    }
}

function emailValidation(email){
    var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if(mailformat.test(email))
    {
        
        return true;
    }
    else
    {
        console.log("Email verification failed.")
        return false;
    }


}

function passwordVailidation(password){
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*[a-zA-Z]).{8,}$/;
    if(passwordRegex.test(password))
    {
        
        return true;
    }
    else
    {
        console.log("Password verification failed.")
        return false;
    }
}

function contactVailidation(contact){
    const contactRegex = /[1-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/;

    if(contactRegex.test(contact))
    {
        
        return true;
    }
    else
    {
        console.log("Contact verification failed.")
        return false;
    }
}




async function createHash(password) {
    const saltRounds = 10;
    password_hash = await bcrypt.hash(password, saltRounds);
    console.log("Hashing have been done....")
    return password_hash;

}


// Fake OTP verification
app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    
    res.send(`
        <h2>You've been compromised!</h2>
        <p>Your details have been logged and reported.</p>
    `);
});



function sendAlert(email, ip, geo) {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL, pass: GMAIL_PASSWORD }
    });

    let mailOptions = {
        from:GMAIL,
        to: email,
        subject: "Alert - Attack Detected",
        text: `Attack detected from IP: ${ip}\nLocation: ${geo.city}, ${geo.country}\nEmail used: ${email}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.log("Error sending email:", error);
        else console.log("Alert email sent:", info.response);
    });
}






async function saveMediaDetails(req, file, fileType) {
    console.log("Saving media details to database...");
    console.log(req.session.user);

    try {
        let user_id = req.session.user.user_id;

        // Check if user_id is a Buffer
        if (Buffer.isBuffer(user_id)) {
            // Convert Buffer to hex string and format it as a UUID
            user_id = [
                user_id.toString("hex").slice(0, 8),
                user_id.toString("hex").slice(8, 12),
                user_id.toString("hex").slice(12, 16),
                user_id.toString("hex").slice(16, 20),
                user_id.toString("hex").slice(20)
            ].join("-");
        }

        // Validate if the final string is a UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
            throw new Error("Invalid UUID format after conversion.");
        }

        const media = new Media({
            media_id: Date.now(), // Unique ID based on timestamp
            uploaded_user_id: user_id, // Correctly formatted UUID
            file_size: file.size,
            file_type: fileType,
            file_url: `/uploads/${fileType.toLowerCase()}s/${file.filename}`,
            is_encrypted: false,
            created_at: new Date(),
            status: "Active"
        });

        await media.save();
        console.log(" Media saved to database:", media);
    } catch (error) {
        console.error(" Error saving media:", error);
    }
}


// // Log attacker details
// function logAttacker(req, email) {
//     const { email, password } = req.body;
//     const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
//     const geo = geoip.lookup(ip) || { country: "Unknown", city: "Unknown" };
    
//     const logData = `
//         Time: ${new Date()}
//         IP: ${ip}
//         Location: ${geo.city}, ${geo.country}
//         User-Agent: ${req.headers["user-agent"]}
//         Email Used: ${email}
//         -----------------------------
//         `;

//     fs.appendFileSync("attackers.log", logData);
//     console.log("Attack detected:", logData);
// }




// ==================================================== Listen ===================================================================================================
app.listen(PORT, () => {
    console.log('serever is live at  port  no: %s', PORT )
});



async function sheed(req, res) {
    try {
        const items = {
            name: req.body.name,
            image: req.body.image,
            Quantity: 100,
            price: req.body.price
        };

        console.log(items, "from seedItem");

        await Items.create(items);
        res.send("Data successfully saved!");
    } catch (err) {
        console.error("Error saving item:", err);
        res.render("error");
    }
}

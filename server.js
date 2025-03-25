









// ============================================== Importing Required Modules ===================================================================================================
const cors = require("cors")
require("dotenv").config()
const path = require('path');
const express = require('express');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const bcrypt = require('bcrypt');
// var cookieParser = require('cookie-parser');
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

const winston = require('winston');

const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const cookieParser = require("cookie-parser");
const session = require("express-session");

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

const securityMiddleware = require("./securityMiddleware");
const csrfMiddleware = require("./csrfMiddleware");

const totpMiddleware = require("./totpMiddleware");
const resetMiddleware = require("./resetMiddleware");

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



app.use(express.json()); 
app.use(cookieParser());

// app.use(require("express-session")(
// {
//     secret: process.env.SECRET,
//     resave:false,
//     saveUninitialized:false
// }));

// app.use(function(req,res,next){
//     res.locals.session = req.session;
//     next();
// });


app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
    }
}));

// Make session accessible in templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Apply CSRF Protection Middleware (Backend Only)
app.use(csrfMiddleware);


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



// Configure Winston logger
// Create a Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs.txt' }), // Log to file
        new winston.transports.Console(), // Log to console
    ],
});

// Preserve original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Override console methods
console.log = (...args) => {
    logger.info(...args); // Log using Winston
    originalConsoleLog(...args); // Call original console.log
};

console.error = (...args) => {
    logger.error(...args); // Log using Winston
    originalConsoleError(...args); // Call original console.error
};

console.warn = (...args) => {
    logger.warn(...args); // Log using Winston
    originalConsoleWarn(...args); // Call original console.warn
};

console.debug = (...args) => {
    logger.debug(...args); // Log using Winston
    originalConsoleDebug(...args); // Call original console.debug
};




// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    req.session.isAdmin = true; // Set isAdmin to true for testing
    const admin = req.session.isAdmin;

    if (admin) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied' });
    }
}











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
        console.log(user);
        // Fetch the media files associated with the user
        const mediaList = await Media.find({ uploaded_user_id: user.user_id });

        // Render the EJS template and pass the data

        res.render("profile", {user: req.session.user,  mediaFiles: mediaList});
    } catch (error) {
        console.log("Error fetching media:", error);
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
    req.session.extraAuth = false;
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
    logger.info("/user/:username page Accessed");
    console.log("Searching for user:", username);
    logger.info("Searching for user:", username);


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
        logger.error("User Finding Error:", err);

        console.error("User Finding Error:", err);
        res.redirect("/profile");
    }
});



app.get("/follow/:username", isLoggedIn, totpMiddleware, resetMiddleware, async (req, res) => {
    try {
        req.session.extraAuth= false;
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
        res.render("followrequest", { users: usersWhoSentRequests });
    } catch (error) {
        console.error("Error fetching follow requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


app.get("/friends", isLoggedIn, async (req, res) => {
    try {
        const currentUser = req.session.user; // Logged-in user

        // Step 1: Find all pending follow requests where currentUser is the target
        const pendingRequests = await Friendship.find({
            status: "Accepted",
            user_id: currentUser._id, // Current user is the recipient
        }).populate("friend_id_or_follow_id", "username name profile_picture_url bio"); // Populate sender details

        // Step 2: Extract users who sent requests
        // console.log("Pending requests:", pendingRequests);
        const usersWhoSentRequests = pendingRequests.map(request => request.friend_id_or_follow_id);

        // Step 3: Pass the data to search.ejs
        // console.log("Users who sent requests:", usersWhoSentRequests);
        res.render("friends", { users: usersWhoSentRequests });
    } catch (error) {
        console.error("Error fetching follow requests:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



app.post('/accept-friend', isLoggedIn,totpMiddleware, resetMiddleware,async (req, res) => {
    const { username } = req.body; 

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required' });
    }

    const currentUser = req.session.user;  // Logged-in user (recipient of request)

    try {
        // Step 1: Find friend user's ObjectId
        const friendUser = await Users.findOne({ username });

        if (!friendUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log('Accepting friend request from:', friendUser._id);

        // Step 2: Find and update friendship record
        const friendRequest = await Friendship.findOneAndUpdate(
            {
                user_id: currentUser._id,              // Current logged-in user is recipient
                friend_id_or_follow_id: friendUser._id, // This is the request sender
                status: 'Pending'
            },
            { $set: { status: 'Accepted' } },
            { new: true }  // Return updated document
        );

        if (!friendRequest) {
            console.log('No matching friend request found for:', friendUser._id);
            return res.status(404).json({ success: false, message: 'Friend request not found' });
        }

        console.log('Friend request accepted:', friendRequest);
        res.json({ success: true, message: 'Friend request accepted' });

    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
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










app.get("/sheed-item", isLoggedIn, function (req, res) {

   res.render("sheed-item");
});

app.post("/sheed-item", isLoggedIn, upload.single("image"), sheed);





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

// *GET: Cart Page**
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
app.get("/addToCart/:name/:q",async (req, res) => {
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
app.get("/order", isLoggedIn,totpMiddleware, resetMiddleware, async (req, res) => {
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
// app.post("/order", isLoggedIn, async (req, res) => {
//     try {
//         const cart = await Cart.find({ username: req.session.user._id });
//         if (!cart.length) return res.render("error");

        

//         for (const cartItem of cart) {
//             const item = await Items.findOne({ name: cartItem.itemname });
//             const orderData = {
//                 username: req.session.user._id, typ: req.session.user.type, name: req.body.name,
//                 itemname: cartItem.itemname, deliverydate: req.body.date, zip: req.body.zip,
//                 contact: req.body.contact, address1: req.body.address1, quantity: cartItem.quantity,
//                 price: item.price
//             };
//             await Orders.create(orderData);
//         }

//         const orderHistory = await Orders.find({ username: req.session.user._id });
//         res.render("history", { order: orderHistory });
//     } catch (err) {
//         console.error(err);
//         res.render("error");
//     }
// });





app.post("/order", isLoggedIn,async (req, res) => {
    try {
        // Fetch cart items
        const cart = await Cart.find({ username: req.session.user._id });
        if (!cart.length) return res.render("error");

        let totalAmount = 0;
        let orderItems = [];

        // Calculate total price and prepare order data
        for (const cartItem of cart) {
            const item = await Items.findOne({ name: cartItem.itemname });
            const price = item.price * cartItem.quantity;
            totalAmount += price;

            orderItems.push({
                username: req.session.user._id,
                typ: req.session.user.type,
                name: req.body.name,
                itemname: cartItem.itemname,
                deliverydate: req.body.date,
                zip: req.body.zip,
                contact: req.body.contact,
                address1: req.body.address1,
                quantity: cartItem.quantity,
                price
            });
        }
        console.log("Order Items:", orderItems);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment", // For one-time payments, use "payment"
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: "Order",
                        },
                        unit_amount: totalAmount * 100, // Stripe expects the amount in the smallest currency unit (paise)
                    },
                    quantity: 1, // Adjust the quantity if needed
                },
            ],
            success_url: `${process.env.SERVER_URL}/profile`, // Ensure the correct success URL
            cancel_url: `${process.env.SERVER_URL}/error`,    // Ensure the correct cancel URL
        });
        // Create Stripe Payment Intent
        // const paymentIntent = await stripe.paymentIntents.create({
        //     amount: totalAmount * 100, // Convert to cents (Stripe uses smallest currency unit)
        //     currency: "usd",
        //     payment_method_types: ["card"]
        // });

        // Store orders in DB after successful payment
        for (const order of orderItems) {
            await Orders.create(order);
        }

        // Clear cart after order is placed
        await Cart.deleteMany({ username: req.session.user._id });

        // Fetch updated order history
        const orderHistory = await Orders.find({ username: req.session.user._id });

        res.redirect(session.url)
        console.log(session)
        // res.render("history", { order: orderHistory, clientSecret: paymentIntent.client_secret });
    } catch (err) {
        console.error(err);
        res.render("error");
    }
});

//  **GET: Order History**
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
// ========================================================================== Traps ===================================================================================================


app.get("/error", function (req, res) {
    res.render("error");
});

app.get("/trap", function (req, res) {
    res.render("trap");
});

app.get("/admin-login", function (req, res) {
    res.render("fake_admin");

});

//  Step 2: Generate and send OTP
app.post("/send-otp", (req, res) => {
    const { email } = req.body;
    console.log("Sending OTP to:", email, GMAIL, GMAIL_PASSWORD);
    const otp = crypto.randomInt(100000, 999999); // Generate a 6-digit OTP

    otpStorage[email] = otp; // Store OTP temporarily

    const mailOptions = {
        from: GMAIL,
        to: email,
        subject: "🔐 Your One-Time Password (OTP) for Secure Access",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #2C3E50; text-align: center;">🔐 Secure Access OTP</h2>
            <p style="font-size: 16px; color: #555;">Hello,</p>
            <p style="font-size: 16px; color: #555;">Thank you for using our service! To complete your verification, please use the following One-Time Password (OTP):</p>
            <div style="text-align: center; font-size: 24px; font-weight: bold; padding: 15px; background-color: #f4f4f4; border-radius: 5px; margin: 10px 0;">
                ${otp}
            </div>
            <p style="font-size: 16px; color: #555;">This OTP is valid for a limited time. Please do not share it with anyone for security reasons.</p>
            <p style="font-size: 16px; color: #555;">If you did not request this OTP, please ignore this email or contact our support team immediately.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="text-align: center; font-size: 14px; color: #777;">
                🔒 Stay Secure, Stay Safe.<br>
                <strong>Your Company Name</strong><br>
                📩 Contact us: <a href="mailto:randomcollegemail@iiitd.ac.in" style="color: #3498DB;"randomcollegemail@iiiitd.ac.in</a>
            </p>
        </div>`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.log("Error sending email:", error);
            return res.send("Error sending OTP. Try again.");
        }

        res.send(`
            <h2>Verify Your Email</h2>
            <form action="/verify-otp" method="POST">
                <input type="hidden" name="email" value="${email}" />
                <input type="text" name="otp" placeholder="Enter OTP" required />
                <button type="submit">Verify</button>
            </form>
        `);
    });
});

//  Step 3: Verify OTP
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

        delete otpStorage[email]; // Remove OTP after use
       
        const mailOptions = {
            from: GMAIL,
            to: email,
            subject: "🔐 Encrypted Log File & Shell Script to Decrypt",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 2px 2px 10px rgba(0,0,0,0.1); background-color: #f9f9f9;">
                
                <!-- Lock Icon -->
                <div style="text-align: center;">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z" fill="#E74C3C"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M6 10V8C6 4.68629 8.68629 2 12 2C15.3137 2 18 4.68629 18 8V10H19C20.1046 10 21 10.8954 21 12V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V12C3 10.8954 3.89543 10 5 10H6ZM8 10H16V8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8V10Z" fill="#E74C3C"/>
                    </svg>
                </div>
        
                <h2 style="color: #E74C3C; text-align: center;">📂 Your Encrypted Files Are Ready</h2>
        
                <p style="font-size: 16px; color: #333;">Hello,</p>
                <p style="font-size: 16px; color: #333;">Attached is an encrypted log file along with a shell script for decryption. Handle it with caution.</p>
        
                <!-- Log Icon -->
                <div style="text-align: center;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4V20H20V4H4ZM6 6H18V18H6V6ZM9 8V10H15V8H9ZM9 12V14H13V12H9ZM9 16V18H11V16H9Z" fill="#2C3E50"/>
                    </svg>
                </div>
        
                <div style="background-color: #2C3E50; color: #ECF0F1; padding: 15px; border-radius: 5px; font-size: 14px; font-family: monospace; margin: 10px 0;">
                    <strong>Message:</strong> UPDATED ADMIN INFO <br>
                    ${logData}
                </div>
        
                <p style="font-size: 16px; color: #333;">⚠ <strong>Security Notice:</strong> Only execute in your machine. Don't Share it with anyone. Since it contains confidential Information..</p>
                
                <p style="font-size: 16px; color: #333;">For further details, contact our security team.</p>
        
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        
                <p style="text-align: center; font-size: 14px; color: #777;">
                    🔐 Stay Secure, Stay Smart.<br>
                    <strong>Social Media Marketplace – Cybersecurity Division</strong><br>
                    📩 Contact us: <a href="mailtorandomcollegemail@iiitd.ac.in" style="color: #3498DB;">randomcollegemail@iiitd.ac.in</a>
                </p>
            </div>`,
            attachments: [
                {
                    filename: "logs.zip",
                    path: "uploads/trap/logs.zip"
                }
            ]
        };
    
        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                console.log("Error sending email:", error);
                return res.redirect("/admin-login");
            }
            console.log("Email sent to attacker:", email);
            res.redirect("/bazinga");
        });

    } else {
        res.redirect("/admin-login");
    }
});




app.post("/verification/huhaha", isLoggedIn, async (req, res) => {
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
        req.session.extraAuth = true;
        res.redirect(req.session.pendingUrl);

    } catch (err) {
        console.error("Login Error:", err);
        res.render("login");
    }
}); 





// Endpoint to fetch logs
app.get('/admin/logs', isAdmin, (req, res) => {
    try {
        // Read logs from the file
        const logs = fs.readFileSync(path.join(__dirname, 'logs.txt'), 'utf-8');
        res.json({ success: true, logs });
    } catch (error) {
        logger.error('Error reading logs:', error); // Log the error
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});

app.get('/admin/attacker-logs', isAdmin, (req, res) => {
    try {
        // Read logs from the file
        const logs = fs.readFileSync(path.join(__dirname, 'attackers.log'), 'utf-8');
        res.json({ success: true, logs });
    } catch (error) {
        logger.error('Error reading logs:', error); // Log the error
        res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
});


app.get("/admin", isAdmin, function (req, res) {
    res.render("admin");
});





// =========================================================================== * ===================================================================================================
app.get("*", function (req, res) {
    res.render("bazinga");
});


// ================================================================ Post Request ===================================================================================================





// app.post("/register", upload.single("profile_picture"), formVailidation, async function(req, res) {
//     if (req.session.user) {
//         return res.redirect("/profile");
//     }
//     if(!req.file){res.render("register")}

//     try {
//         const passwordHash = await createHash(req.body.password);

//         const user = {
//             username: req.body.username,
//             name: req.body.name,
//             email: req.body.email,
//             mobile_number: req.body.mobile_number,
//             password_hash: passwordHash,
//             bio: req.body.bio,
//             profile_picture_url: req.file ? `/uploads/profile_pictures/${req.file.filename}` : null
//         };

//         const foundUser = await Users.findOne({ mobile_number: req.body.mobile_number });
//         if (foundUser) {
//             return res.send("Mobile number is already in use.");
//         }

//         const newUser = await Users.create(user);
//         console.log(newUser);
//         res.redirect("/login");

//     } catch (err) {
//         console.error(err);
//         res.render("register");
//     }
// });




app.post("/register", upload.single("profile_picture"), formVailidation, async function (req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }
    if (!req.file) {
        return res.render("register");
    }

    try {
        const passwordHash = await createHash(req.body.password);

        // Check if user already exists
        const existingUser = await Users.findOne({ mobile_number: req.body.mobile_number });
        if (existingUser) {
            return res.status(400).json({ error: "Mobile number is already in use." });
        }

        // Generate a TOTP secret
        const totpSecret = speakeasy.generateSecret({ length: 20 });

        // Store user but mark as unverified
        const pendingUser = {
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            mobile_number: req.body.mobile_number,
            password_hash: passwordHash,
            bio: req.body.bio,
            profile_picture_url: req.file ? `/uploads/profile_pictures/${req.file.filename}` : null,
            totp_secret: totpSecret.base32, // Store the base32 secret
            is_verified: false,
        };

        await Users.create(pendingUser);

        // Generate QR code for the secret
        const otpauth_url = totpSecret.otpauth_url;
        QRCode.toDataURL(otpauth_url, function (err, qrCodeDataURL) {
            if (err) {
                console.error("QR Code Generation Error:", err);
                return res.status(500).json({ error: "Failed to generate QR Code" });
            }

            // Render a page with the QR code
            res.send(qrform);
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
});


app.post("/verify-totp", async function (req, res) {
    try {
        const { mobile_number, totp_token } = req.body;

        // Find the unverified user
        const user = await Users.findOne({ mobile_number });
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: "User already verified." });
        }

        // Verify the TOTP token
        const isValid = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: "base32",
            token: totp_token,
            window: 1, // Allow small time drift
        });

        if (!isValid) {
            return res.status(400).json({ error: "Invalid TOTP token." });
        }

        // Mark user as verified
        // user.is_verified = true;
        await user.save();
        req.session.totp_verified = true;
        console.log(req.session.pendingFormData);
        if (req.session.pendingFormData && req.session.pendingMethod === "POST") {
            const returnTo = req.session.returnTo || "/profile/update";
            const formData = req.session.pendingFormData;
    
            // Clear stored session data
            delete req.session.pendingFormData;
            delete req.session.pendingMethod;
            delete req.session.returnTo;
    
            // Send a hidden form that auto-submits the stored data
            let formFields = "";
            for (const key in formData) {
                formFields += `<input type="hidden" name="${key}" value="${formData[key]}">`;
            }
            console.log("Form Fields:", formFields);
            temp = `
                <h2> TOTP Verified! Redirecting...</h2>
                <form id="replayForm" action="${returnTo}" method="POST">
                    ${formFields}
                    <button type="submit">Click here if not redirected</button>
                </form>
                <script>
                    document.getElementById("replayForm").submit();
                </script>
            `;
            console.log(temp);    
            return res.send(`
                <h2> TOTP Verified! Redirecting...</h2>
                <form id="replayForm" action="${returnTo}" method="POST">
                    ${formFields}
                    <button type="submit">Click here if not redirected</button>
                </form>
                <script>
                    document.getElementById("replayForm").submit();
                </script>
            `);
        }

        console.log("Method:", req.session.pendingMethod);


        const redirectUrl = req.session.returnTo || "/";
        delete req.session.returnTo; // Remove from session after use
        return res.redirect(redirectUrl);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Verification failed" });
    }
});







app.post("/login", totpMiddleware, resetMiddleware, async function(req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }
    console.log("Login Request:", req.body);

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
app.post("/profile/update", isLoggedIn,totpMiddleware, resetMiddleware,upload.single("profile_picture"), async (req, res) => {
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


// ==============================================================Chat Fucntionality ==================

app.post("/chat-profile", isLoggedIn,function (req, res) {  
    console.log("Chat Profile Accessed");
    res.status(200).send("user :"+req.session.user.username + "You are Logged in with Email ID :"+ req.session.user.email);
});





app.post("/chat-list-friends", isLoggedIn, async function (req, res) {  
    try {
        const currentUser = req.session.user;
    
        const friends = await Friendship.find({
            status: "Accepted",
            user_id: currentUser._id, // Current user is the recipient
        }).populate("friend_id_or_follow_id", "username name");  // Only populate username & name
    
        // Extract only username and name
        const simplifiedFriends = friends.map(friend => ({
            username: friend.friend_id_or_follow_id.username,
            name: friend.friend_id_or_follow_id.name
        }));
    
        console.log("Chat Profile Accessed");
    
        res.status(200).send({ friends: simplifiedFriends }); // Send simplified list
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/chat/send-message", isLoggedIn, async (req, res) => {
    const { receiver, message, isGroup } = req.body;

    if (!message || message.trim() === "") {
        return res.status(400).send("Message content is required.");
    }

    try {
        const senderId = req.session.user.user_id;

        let receiverId;

        if (isGroup) {
            receiverId = receiver;
        } else {
            const receiverUser = await Users.findOne({ username: receiver });
            if (!receiverUser) {
                return res.status(404).send("User not found");
            }
            receiverId = receiverUser.user_id;
        }

        const newMessage = new Message({
            sender_id: senderId,
            receiver_id: receiverId,
            receiverType: isGroup ? "Group" : "User",
            message_content: message,
            created_at: new Date()
        });

        console.log("Sending message:", newMessage);

        await newMessage.save();

        res.status(200).send({ success: true, message: "Message sent" });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).send("Internal Server Error");
    }
});



app.post("/chat/fetch-messages", isLoggedIn, async (req, res) => {
    const { receiver, isGroup } = req.body;

    try {
        const userId = req.session.user.user_id;  
        const receiverType = isGroup ? "Group" : "User";

        const filter = {
            receiverType,
            $or: [
                { sender_id: userId, receiver_id: receiver },
                { sender_id: receiver, receiver_id: userId }
            ]
        };

        const messages = await Message.find(filter).sort({ created_at: 1 });
        res.status(200).send({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).send("Internal Server Error");
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



// ================================================================== Administraion ===================================================================================================




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



// async function sheed(req, res) {
//     try {
//         const items = {
//             name: req.body.name,
//             image: req.body.image,
//             Quantity: 100,
//             price: req.body.price
//         };

//         console.log(items, "from seedItem");

//         await Items.create(items);
//         res.send("Data successfully saved!");
//     } catch (err) {
//         console.error("Error saving item:", err);
//         res.render("error");
//     }
// }

async function sheed(req, res) {
    try {
        if (!req.file) {
            return res.status(400).send("Image file is required.");
        }

        const items = {
            name: req.body.name,
            image: `/uploads/images/${req.file.filename}`, // Save image path
            Quantity: 100,
            price: req.body.price
        };

        console.log(items, "from sheed");

        await Items.create(items);
        res.send({ message: "Item successfully saved!", item: items });
    } catch (err) {
        console.error("Error saving item:", err);
        res.status(500).send("Error saving item.");
    }
}
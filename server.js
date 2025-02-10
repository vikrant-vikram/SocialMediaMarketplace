









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
let fs = require('fs');
const mongoose=require("mongoose");
const { Hash } = require("crypto");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
// const { $where } = require("./models/users");





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










// =============================================================== Middleware ===================================================================================================


app.use(cors({
    origin: '*'
}));

// setting us some local verialbles
const  PORT = process.env.PORT ;

const DBSERVER=process.env.MONGOOSE_DBSERVER;


mongoose.connect(DBSERVER, {useNewUrlParser: true,useUnifiedTopology: true}).then(data=>{
    console.log("Connected To Mongoose Database....");
}).catch(err=>{
    console.log(err);
});




// var session = require('express-session');



app.use(cookieParser());
// app.use(session({secret: "Shh, its a secret!"}));
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



// Configure Multer for File Uploads

// Ensure upload directories exist
const directories = ["uploads/images", "uploads/videos", "uploads/audio"];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fileType = file.mimetype.split("/")[0]; // Get the type (image, video, audio)
        let folder = "uploads/others"; // Default folder

        if (fileType === "image") {
            folder = "uploads/images";
        } else if (fileType === "video") {
            folder = "uploads/videos";
        } else if (fileType === "audio") {
            folder = "uploads/audio";
        }

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename file
    }
});


const upload = multer({ storage: storage });


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

app.get('/search', isLoggedIn, (req, res, next) => {
    res.render('search');
});


app.get('/chat',isLoggedIn, async (req, res, next) => {
    res.render('chat');
});
  
  
app.get("/profile",isLoggedIn,async function (req, res) {
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
    res.render("marketplace");

});

app.get("/explore",isLoggedIn,function (req, res) {
    res.render("explore");

});

app.get("/upload",isLoggedIn,function (req, res) {
    res.render("upload");

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



app.get("/login" , function (req, res) {
    if(req.session.user){
        res.redirect("/profile")
    }
    console.log("/login-page accerss")
    res.render("login");
    
});





app.get("*", function (req, res) {
    res.render("bazinga");
});






// ================================================================ Post Request ===================================================================================================



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




app.post("/register", formVailidation, async function( req,res) {
    

    // Have Not implemented the Hashing of password yet

    if(req.session.user){
        res.redirect("/profile")
    }

    const passwordHash = await createHash(req.body.password); 

    const user={
        username:req.body.username,
        name:req.body.name,
        email:req.body.email,
        mobile_number:req.body.mobile_number,
        password_hash:passwordHash,
        profile_picture_url:req.body.profile
    }
            
    // console.log(req.body.name);
    console.log(user);
    await Users.findOne({contact_number:"req.body.contact_number"}).then(found=>{
        if(found)
        res.send("Contact is alreaady in Use");
        else{
            Users.create(user).then(user=>{
        

                console.log(user);
                res.render("login");
                
            }).catch(err=>{
                console.log(err)
                res.render("register")
            });
        }
    }).catch(err=>{
        console.log(err);
        res.render("register");
    });    
        
    
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


app.listen(PORT, () => {
    console.log('serever is live at  port  no: %s', PORT )
});



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








 
// Vialidation are here


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
    console.log("Hashing have been done")
    return password_hash;

}
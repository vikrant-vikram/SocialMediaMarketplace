









// ============================================== Importing Required Modules ===================================================================================================
// const cors = require("cors")
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
const { Server } = require("socket.io");
const cors = require("cors");
const http = require("http");
const sharedSession = require("express-socket.io-session");

// const crypto = require("crypto");

const helmet = require("helmet");

const { webcrypto } = require("crypto");
// const fs = require("fs").promises; // Using promises for async file operations

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
const { send } = require("process");

const GMAIL = process.env.GMAIL_ID;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
// setting us some local verialbles
const  PORT = process.env.PORT ;

const DBSERVER=process.env.MONGOOSE_DBSERVER;


// =============================================================== Middleware ===================================================================================================


app.use(cors({
    origin: '*'
}));


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"],
  },
});

// app.use(helmet());

// app.use(
//     helmet.contentSecurityPolicy({
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self"],
//         objectSrc: ["'none'"],
//         upgradeInsecureRequests: [],
//       },
//     })
//   );

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
// const sessionMiddleware = session({
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "Strict"
//     }
// });


const MongoStore = require("connect-mongo");

// const sessionMiddleware = session({
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({
//         mongoUrl: process.env.MONGOOSE_DBSERVER, // Use your MongoDB URL
//         collectionName: "sessions",
//     }),
//     cookie: {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production", 
//         sameSite: "Strict"
//     }
// });

// app.use(sessionMiddleware);
// io.use(sharedSession(sessionMiddleware, { autoSave: true }));
// Update your session configuration:
const sessionMiddleware = session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGOOSE_DBSERVER,
        collectionName: "sessions",
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'Lax', // Changed from Strict to Lax for better compatibility
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    }
});

// Ensure proper ordering of middleware
app.use(sessionMiddleware);
// app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Socket.IO session sharing
io.engine.use(sessionMiddleware); // Additional session attachment
io.use(sharedSession(sessionMiddleware, {
    autoSave: true,
    saveUninitialized: false
}));
// app.use(sessionMiddleware);

// Make session accessible in templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Apply CSRF Protection Middleware (Backend Only)
app.use(csrfMiddleware);

io.use(sharedSession(sessionMiddleware, { autoSave: true }));
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




function logXSSAttempt(userInput, req) {
    console.log("Checking for XSS attempts...");    
    const suspicious = /<script.*?>|on\w+=|javascript:/i;
    if (suspicious.test(userInput)) {
                const logEntry = `[${new Date().toISOString()}] Suspected XSS Attempt:
        IP: ${req.ip}
        Path: ${req.originalUrl}
        User-Agent: ${req.headers['user-agent']}
        Input: ${userInput}

        `;

        fs.appendFileSync(path.join(__dirname, 'attackers.log'), logEntry, 'utf8');
        console.warn("  XSS attempt detected and logged!");
    }
}



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



app.use((req, res, next) => {
    if (req.method === "POST" && req.body) {
        const flatInputs = JSON.stringify(req.body);
        logXSSAttempt(flatInputs, req);
    }
    next();
});

// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
    const admin = req.session.isAdmin;

    if (admin) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied' });
    }
}


app.use(cors());




// const Message = mongoose.model("Message", messageSchema);

// ================================================Socker io ===================================================================================================

// io.on("connection", isLoggedIn,(socket) => {
//     console.log("A user connected");
//     console.log(socket.request.session.user);
  
//     // User joins a one-on-one chat
//     socket.on("join", async ({ username, withUser }) => {
//       socket.join(username);
//       console.log(`📥 ${username} joined chat with ${withUser}`);
  
//       const messages = await Message.find({
//         $or: [
//           { sender: username, recipient: withUser },
//           { sender: withUser, recipient: username },
//         ],
//       }).sort({ timestamp: 1 });
  
//       messages.forEach((msg) => {
//         socket.emit("chat message", {
//           sender: msg.sender,
//           recipient: msg.recipient,
//           encryptedMessage: msg.encryptedMessage,
//           iv: msg.iv,
//         });
//       });
//     });
  
//     // Handle incoming messages
//     socket.on("chat message", async (data) => {
//       const { sender, recipient, encryptedMessage, iv } = data;
  
//       const newMsg = new Message({
//         sender,
//         recipient,
//         encryptedMessage,
//         iv,
//       });
//       await newMsg.save();
  
//       // Send to recipient if online
//       io.to(recipient).emit("chat message", data);
  
//       // Also send to sender (to show own message)
//       io.to(sender).emit("chat message", data);
//     });
  
//     socket.on("disconnect", () => {
//       console.log(" A user disconnected");
//     });
//   });


// 🔹 SOCKET.IO Connection
io.on("connection", (socket) => {
    console.log(" A user connected");

    // 🔹 Access session inside socket connection
    const session = socket.request.session;
    console.log("Session data:", session);
    if (!session || !session.user) {
        console.log(" Unauthorized user attempted to connect via WebSocket");
        return socket.disconnect(true); // Force disconnect unauthorized user
    }

    console.log("🔑 User authenticated via WebSocket:", session.user.username);

    // Join chat
    socket.on("join", async ({ username, withUser }) => {
        socket.join(username);
        console.log(`📥 ${username} joined chat with ${withUser}`);

        const messages = await Message.find({
            $or: [
                { sender: session.user.username, recipient: withUser },
                { sender: withUser, recipient: session.user.username },
            ],
        }).sort({ timestamp: 1 });

        messages.forEach((msg) => {
            socket.emit("chat message", {
                sender: msg.sender,
                recipient: msg.recipient,
                encryptedMessage: msg.encryptedMessage,
                iv: msg.iv,
            });
        });
    });

    // Handle chat messages
    socket.on("chat message", async (data) => {
        console.log("📩 New message received:", data);
        const session = socket.request.session;

        let { sender, recipient, encryptedMessage, iv } = data;
        sender = session.user.username
        const newMsg = new Message({
            sender,
            recipient,
            encryptedMessage,
            iv,
        });
        await newMsg.save();

        // Send message to recipient and sender
        io.to(recipient).emit("chat message", data);
        io.to(sender).emit("chat message", data);
    });

    socket.on("disconnect", () => {
        console.log(" A user disconnected");
    });
});

  
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

    res.render('chat', { user: req.session.user , friends: usersWhoSentRequests});   
});
  
  
app.get("/profile",isLoggedIn,async function (req, res) {
    console.log("Profile page accessed");
    try {
        // Get user from session
        const user = req.session.user;
        delete req.session.totp_verified;
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


app.get("/editprofile",isLoggedIn,totpMiddleware,function (req, res) {
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

app.get('/contact', (req, res) => {
    res.render('contact');
});


app.get("/blockunblock",isLoggedIn,function (req, res) {

    res.send("Abhi Nhi Kr sakte bhai");

});



app.get("/privacypolicy", function (req, res) {
    res.render("privacypolicy");
});



app.get("/faq", function (req, res) {
    res.render("faq");
});

app.get("/generalterms", function (req, res) {
    res.render("generalterms");
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



// app.get("/follow/:username", isLoggedIn, totpMiddleware, resetMiddleware, async (req, res) => {
//     try {
//         req.session.extraAuth= false;
//         const currentUser = req.session.user; // Logged-in user
//         const targetUser = await Users.findOne({ username: req.params.username });

//         console.log("Following user:", targetUser);
//         console.log("Current user:", currentUser);

//         // If no target user is found, redirect to a search or error page
//         if (!targetUser) {
//             return res.redirect("/search"); // Or a custom error page
//         }

//         // Check if a follow request already exists
//         const existingFollow = await Friendship.findOne({
//             user_id: currentUser._id,
//             friend_id_or_follow_id: targetUser._id,
//         });

//         // If the user is already following, redirect to the profile page
//         if (existingFollow) {
//             return res.redirect(`/user/${targetUser.username}`);
//         }

//         // Create a new follow request if no existing request is found
//         const followRequest = new Friendship({
//             relationship_id: Math.floor(Math.random() * 1000000), // Generate a unique ID
//             user_id: currentUser._id,
//             friend_id_or_follow_id: targetUser._id,
//             status: "Pending",
//         });

//         await followRequest.save();

//         // Respond with success message or redirect to the target user's profile
//         return res.redirect(`/user/${targetUser.username}`); // Redirect to target user's profile page
//     } catch (error) {
//         console.error("Error following user:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

app.get("/follow/:username", isLoggedIn, totpMiddleware, resetMiddleware, async (req, res) => {
    try {
        req.session.extraAuth = false;
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

        if (existingFollow) {
            // If the existing request is pending, remove it from the Friendship table
            if (existingFollow.status === "Pending") {
                await Friendship.deleteOne({ _id: existingFollow._id });
                console.log("Pending follow request removed.");
            }
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
        console.log("New follow request created.");

        // Redirect to the target user's profile page
        return res.redirect(`/user/${targetUser.username}`);
    } catch (error) {
        console.error("Error following user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// app.get("/followrequest", isLoggedIn, async (req, res) => {
//     try {
//         const currentUser = req.session.user; // Logged-in user

//         // Step 1: Find all pending follow requests where currentUser is the target
//         const pendingRequests = await Friendship.find({
//             status: "Pending",
//             user_id: currentUser._id, // Current user is the recipient
//         }).populate("friend_id_or_follow_id", "username name profile_picture_url bio"); // Populate sender details

//         // Step 2: Extract users who sent requests
//         console.log("Pending requests:", pendingRequests);
//         const usersWhoSentRequests = pendingRequests.map(request => request.friend_id_or_follow_id);

//         // Step 3: Pass the data to search.ejs
//         console.log("Users who sent requests:", usersWhoSentRequests);
//         res.render("followrequest", { users: usersWhoSentRequests });
//     } catch (error) {
//         console.error("Error fetching follow requests:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });
app.get("/followrequest", isLoggedIn, async (req, res) => {
    try {
        // 1. Validate user session
        if (!req.session.user?._id) {
            console.error('No valid user session');
            return res.status(401).redirect('/login');
        }

        const currentUserId = req.session.user._id;
        
        // 2. Find all pending requests where current user is the recipient (user_id)
        const pendingRequests = await Friendship.find({
            status: "Pending",
            friend_id_or_follow_id: currentUserId  // The user being followed (recipient)
        })
        .populate({
            path: "user_id",  // The user who sent the request (requester)
            select: "_id username name profile_picture_url bio",
            model: "User"
        })
        .sort({ request_sent: -1 })  // Sort by most recent requests first
        .lean();

        // 3. Extract and format requesters' data
        const requesters = pendingRequests.map(request => {
            if (!request.user_id) return null;
            
            return {
                _id: request.user_id._id,
                username: request.user_id.username,
                name: request.user_id.name,
                profile_picture_url: request.user_id.profile_picture_url,
                bio: request.user_id.bio,
                requestId: request._id,  // The friendship request ID
                requestDate: request.request_sent
            };
        }).filter(Boolean);  // Remove any null entries

        // 4. Render the view
        console.log("Follow requests:", requesters);
        res.render("followrequest", {
            title: "Follow Requests",
            users: requesters,
            currentUserId: currentUserId,
            isEmpty: requesters.length === 0
        });

    } catch (error) {
        console.error("Follow request error:", {
            error: error.message,
            userId: req.session.user?._id,
            stack: error.stack
        });
        res.status(500).render('error', {
            message: 'Failed to load follow requests',
            error: process.env.NODE_ENV === 'development' ? error : null
        });
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

// app.get("'/accept/follow/:username", isLoggedIn, async (req, res) => {       



//     const username = req.params.username;
//     console.log("Accepting follow request from:", username);
//     try {
//         // Step 1: Find friend user's ObjectId
//         const friendUser = await Users.findOne({ username });

//         if (!friendUser) {
//             return res.status(404).json({ success: false, message: 'User not found' });
//         }

//         console.log('Accepting follow request from:', friendUser._id);

//         // Step 2: Find and update friendship record
//         const friendRequest = await Friendship.findOneAndUpdate(
//             {
//                 user_id: friendUser._id,              // Current logged-in user is recipient
//                 friend_id_or_follow_id: req.session.user._id, // This is the request sender
//                 status: 'Pending'
//             },
//             { $set: { status: 'Accepted' } },
//             { new: true }  // Return updated document
//         );

//         if (!friendRequest) {
//             console.log('No matching friend request found for:', friendUser._id);
//             return res.status(404).json({ success: false, message: 'Friend request not found' });
//         }

//         console.log('Friend request accepted:', friendRequest);
//         res.json({ success: true, message: 'Friend request accepted' });

//     } catch (error) {
//         console.error('Error accepting friend request:', error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     }
// });



// this one accept the request
app.get("/accept/follow/:username", isLoggedIn, async (req, res) => {
    try {
        // 1. Validate inputs
        const { username } = req.params;
        const currentUserId = req.session.user._id;
        
        if (!username || !currentUserId) {
            console.error('Invalid parameters:', { username, currentUserId });
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        console.log(`Accepting follow request from ${username} for user ${currentUserId}`);

        // 2. Find the requesting user (Use correct model reference: "User" instead of "Users")
        const requestingUser = await Users.findOne({ username }).select('_id');
        if (!requestingUser) {
            console.error('Requesting user not found:', username);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 3. Verify the pending request exists (Ensure IDs are `ObjectId`)
        const existingRequest = await Friendship.findOne({
            user_id: new mongoose.Types.ObjectId(requestingUser._id),  // Ensure it's ObjectId
            friend_id_or_follow_id: new mongoose.Types.ObjectId(currentUserId), // Ensure it's ObjectId
            status: 'Pending'
        });

        if (!existingRequest) {
            console.error('No pending request found from:', {
                requester: requestingUser._id,
                recipient: currentUserId
            });
            return res.status(404).json({ 
                success: false, 
                message: 'No pending request found from this user' 
            });
        }

        // 4. Update the request status
        const updatedRequest = await Friendship.findByIdAndUpdate(
            existingRequest._id,
            { $set: { status: 'Accepted', updated_at: new Date() } },  // Ensure `updated_at` is defined in schema
            { new: true }
        );

        console.log('Successfully accepted request:', updatedRequest);
        res.redirect(`/user/${username}`); // Redirect to the user's profile page

    } catch (error) {
        console.error('Error accepting follow request:', {
            error: error.message,
            stack: error.stack,
            params: req.params,
            userId: req.session.user?._id
        });
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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












// app.get('/verifyusers', isAdmin, async (req, res) => {
//   try {
//     const users = await Users.find({}, {
//       user_id: 1,
//       username: 1,
//       name: 1,
//       email: 1,
//       advance_verified: 1,
//       created_at: 1,
//       _id: 0
//     }).sort({ created_at: -1 });
//     console.log("Fetched users for verification:", users);
    
    
//     res.render('verifyusers', { users });
    
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).send('Server Error');
//   }
// });


// app.put('/admin/users/:userId/verify', isAdmin, async (req, res) => {
//     console.log("Admin verification endpoint accessed");
//     console.log("Request body:", req.body);
//   try {
//     const { userId } = req.params;
//     const { verified } = req.body;

//     const updatedUser = await Users.findOneAndUpdate(
//       { user_id: userId },
//       { advance_verified: verified, updated_at: Date.now() },
//       { new: true, projection: { _id: 0, password_hash: 0 } }
//     );

//     console.log("Updated user:", updatedUser);

//     if (!updatedUser) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }
//     console.log("User verification updated:", updatedUser);
//     // Log the admin action

//     res.json({ success: true, user: updatedUser });
//   } catch (error) {
//     console.error('Error updating verification:', error);
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// });
// Admin dashboard - render EJS template
app.get('/admin/login', async (req, res) => {
    res.render('admin-login');
  });
  


  app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;

  
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.redirect("/verifyusers")
    } else {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/admin/login');
    }
  });

// Logout Route
app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  });

// Admin dashboard - render EJS template
app.get('/verifyusers', isAdmin, async (req, res) => {
  try {
    const users = await Users.find({}, {
      user_id: 1,
      username: 1,
      name: 1,
      email: 1,
      advance_verified: 1,
      is_suspended: 1,
      created_at: 1,
      _id: 0
    }).sort({ created_at: -1 });
    
    res.render('verifyusers', { users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Server Error');
  }
});

// Handle verification toggle
app.put('/admin/users/:userId/verify', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    const updatedUser = await Users.findOneAndUpdate(
      { user_id: userId },
      { advance_verified: verified, updated_at: Date.now() },
      { new: true, projection: { _id: 0, password_hash: 0 } }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating verification:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Handle suspension toggle
app.put('/admin/users/:userId/suspend', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended } = req.body;

    const updatedUser = await Users.findOneAndUpdate(
      { user_id: userId },
      { is_suspended: suspended, updated_at: Date.now() },
      { new: true, projection: { _id: 0, password_hash: 0 } }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating suspension status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
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











// app.get("/sheed-item", isLoggedIn,totpMiddleware, function (req, res) {
//     if(req.session.user.advance_verified){ 
//         return res.render("sheed-item");
//     }

//    res.send("U r Not verified to sell items");
// });


app.get("/sheed-item", isLoggedIn, totpMiddleware,async (req, res) => {
    try {

        const user = await Users.findOne({ user_id: req.session.user.user_id });
        req.session.user = user;

        if (user.advance_verified) {
            return res.render("sheed-item");
        }

        res.status(403).send(" You are not verified to sell items.");
    } catch (err) {
        console.error("Error checking advance verification:", err);
        res.status(500).send("Internal Server Error");
    }
});


app.post("/sheed-item", isLoggedIn,resetMiddleware, upload.single("image"), sheed);





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





// app.post("/order", isLoggedIn,async (req, res) => {
//     try {
//         // Fetch cart items
//         const cart = await Cart.find({ username: req.session.user._id });
//         if (!cart.length) return res.render("error");

//         let totalAmount = 0;
//         let orderItems = [];

//         // Calculate total price and prepare order data
//         for (const cartItem of cart) {
//             const item = await Items.findOne({ name: cartItem.itemname });
//             const price = item.price * cartItem.quantity;
//             totalAmount += price;

//             orderItems.push({
//                 username: req.session.user._id,
//                 typ: req.session.user.type,
//                 name: req.body.name,
//                 itemname: cartItem.itemname,
//                 deliverydate: req.body.date,
//                 zip: req.body.zip,
//                 contact: req.body.contact,
//                 address1: req.body.address1,
//                 quantity: cartItem.quantity,
//                 price
//             });
//         }
//         console.log("Order Items:", orderItems);

//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ["card"],
//             mode: "payment", // For one-time payments, use "payment"
//             line_items: [
//                 {
//                     price_data: {
//                         currency: 'inr',
//                         product_data: {
//                             name: "Order",
//                         },
//                         unit_amount: totalAmount, // Stripe expects the amount in the smallest currency unit (paise)
//                     },
//                     quantity: 1, // Adjust the quantity if needed
//                 },
//             ],
//             success_url: `${process.env.SERVER_URL}/profile`, // Ensure the correct success URL
//             cancel_url: `${process.env.SERVER_URL}/error`,    // Ensure the correct cancel URL
//         });
//         // Create Stripe Payment Intent
//         // const paymentIntent = await stripe.paymentIntents.create({
//         //     amount: totalAmount * 100, // Convert to cents (Stripe uses smallest currency unit)
//         //     currency: "usd",
//         //     payment_method_types: ["card"]
//         // });

//         // Store orders in DB after successful payment
//         for (const order of orderItems) {
//             await Orders.create(order);
//         }

//         // Clear cart after order is placed
//         await Cart.deleteMany({ username: req.session.user._id });

//         // Fetch updated order history
//         const orderHistory = await Orders.find({ username: req.session.user._id });

//         res.redirect(session.url)
//         console.log(session)
//         // res.render("history", { order: orderHistory, clientSecret: paymentIntent.client_secret });
//     } catch (err) {
//         console.error(err);
//         res.render("error");
//     }
// });



// ==========  **POST: Place Order with Stripe Checkout** check this once


app.post("/order", isLoggedIn, async (req, res) => {
    try {
        // Fetch cart items
        const cart = await Cart.find({username: req.session.user._id  }); 
        if (!cart.length) return res.render("error"); // Ensure cart is not empty

        let totalAmount = 0;

        // Fetch all item details in parallel
        const itemNames = cart.map(cartItem => cartItem.itemname);
        const items = await Items.find({ name: { $in: itemNames } });

        if (items.length !== cart.length) return res.render("error"); // Prevent order if any item is missing

        // Prepare order items

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

        const orderItems = cart.map(cartItem => {
            const item = items.find(i => i.name === cartItem.itemname);
            const price = item.price * cartItem.quantity;
            totalAmount += price;
            return {
                username:req.session.user._id ,
                typ: req.session.user.type,
                name: req.body.name,
                itemname: cartItem.itemname,
                deliverydate: req.body.date,
                zip: req.body.zip,
                contact: req.body.contact,
                address1: req.body.address1,
                quantity: cartItem.quantity,
                price
            };
        });

        console.log("Order Items:", orderItems);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [{
                price_data: {
                    currency: 'inr',
                    product_data: { name: "Order" },
                    unit_amount: totalAmount * 100, // Convert Rupees to Paise
                },
                quantity: 1,
            }],
            success_url: `${process.env.SERVER_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`, // Redirect here after success
            cancel_url: `${process.env.SERVER_URL}/error`,
        });

        res.redirect(session.url);
        console.log("Stripe Session:", session);

        // Do not store orders in DB yet! Store them only after successful payment.
    } catch (err) {
        console.error("Order Error:", err);
        res.render("error");
    }
});
app.get("/order-success", isLoggedIn, async (req, res) => {
    try {
        if (!req.session.user) {
            console.warn(" User session lost after payment. Redirecting to login.");
            return res.redirect("/login");
        }

        const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

        if (!session || session.payment_status !== "paid") {
            return res.render("error"); // Prevent incomplete orders
        }

        const username = req.session.user._id;
        if (!username) {
            return res.redirect("/login"); // Ensure user is logged in
        }

        const cart = await Cart.find({ username });

        if (!cart.length) {
            return res.render("error", { message: "No items found in your cart." });
        }

        const orderItems = cart.map(cartItem => ({
            username,
            typ: req.session.user.type,
            name: req.session.user.name,
            itemname: cartItem.itemname,
            deliverydate: new Date().toISOString(),
            zip: req.session.user.zip || "000000",
            contact: req.session.user.contact || "N/A",
            address1: req.session.user.address1 || "N/A",
            quantity: cartItem.quantity,
            price: cartItem.quantity * 100,
        }));

        await Orders.insertMany(orderItems);
        await Cart.deleteMany({ username });

        console.log(" Order stored successfully & cart cleared.");

        res.render("history", { order: orderItems });
    } catch (error) {
        console.error("Order Success Error:", error);
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



//  Step 3: Verify OTP
const attemptTracker = {}; // Structure: { email: { count, lastAttempt, blockedUntil } }

const MAX_ATTEMPTS = 2;
const BLOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes block
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

//  Step 2: Generate and send OTP
app.post("/send-otp", (req, res) => {
    const { email } = req.body;


    if (!attemptTracker[email]) {
        attemptTracker[email] = { count: 0, lastAttempt: Date.now(), blockedUntil: null };
    }

    const tracker = attemptTracker[email];
    const now = Date.now();

    // Handle block
    if (tracker.blockedUntil && now < tracker.blockedUntil) {
        return res.status(429).send("Too many attempts. Try again later.");
    }

    // Reset count if window passed
    if (now - tracker.lastAttempt > ATTEMPT_WINDOW_MS) {
        tracker.count = 0;
    }
    console.log("Current attempt count:", tracker.count);

    tracker.lastAttempt = now;
    tracker.count++;
    if (tracker.count >= MAX_ATTEMPTS) {
        tracker.blockedUntil = now + BLOCK_DURATION_MS;
        console.warn(`Too many attempts for ${email}. Blocking for 10 mins.`);
    }


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
                <strong>Social Media Marketplace – Cybersecurity Division</strong><br>
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
            <form id="otp-form" action="/verify-otp" method="POST">
                <input type="hidden" name="email" value="${email}" />
                <input type="text" name="otp" placeholder="Enter OTP" required pattern="\\d{6}" />
                <button type="submit" id="submit-btn">Verify</button>
            </form>

            <script>
                const form = document.getElementById("otp-form");
                const submitBtn = document.getElementById("submit-btn");

                form.addEventListener("submit", function () {
                    // Prevent DoS by disabling the button after submission
                    submitBtn.disabled = true;
                    submitBtn.innerText = "Verifying...";

                    // Re-enable after delay (optional: just for UX reset)
                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Verify";
                    }, 5000); // Disable for 5 seconds
                });
            </script>
        `);
    });
});





app.post("/verify-otp", (req, res) => {
    const { email, otp } = req.body;
    // const { email, otp } = req.body;

    // Initialize tracker for this email


    


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

app.get('/admin/attacklogs', isAdmin, (req, res) => {
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
    res.redirect("verifyusers");
});



app.get("/verifyemail", async function(req, res) { 
    console.log("Email Verification Request:", req.session.email);
    const email = req.session.email;
    delete  req.session.email;
    console.log("Sending OTP to:", email, GMAIL, GMAIL_PASSWORD);
    const otp = crypto.randomInt(100000, 999999); // Generate a 6-digit OTP

    otpStorage[email] = {
        code: generatedOtp, // e.g. "123456"
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0, // initial attempt count
        maxAttempts: 5 // limit
    }; // Store OTP temporarily

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
               <strong>Social Media Marketplace – Cybersecurity Division</strong><br>
                📩 Contact us: <a href="mailto:randomcollegemail@iiitd.ac.in" style="color: #3498DB;">randomcollegemail@iiiitd.ac.in</a>
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
            <form action="/verifyemail" method="POST">
                <input type="hidden" name="email" value="${email}" />
                <input type="text" name="otp" placeholder="Enter OTP" required />
                <button type="submit">Verify</button>
            </form>
        `);
    });

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



// Helper: Promisify QR code generation
function generateQRCodeAsync(url) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(url, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
}

app.post("/login", async function (req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }

    console.log("Login Request:", req.body);

    try {
        const user = await Users.findOne({ mobile_number: req.body.mobile_number });

        if (!user) {
            console.log("No user found with this mobile number");
            return res.redirect("/login");
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password_hash);
        if (!isMatch) {
            console.log("Incorrect password");
            return res.render("login");
        }

        if (user.is_suspended) {
            return res.send("You have been suspended. Please contact support.");
        }

        // Handle TOTP Setup
        if (!user.totp_secret) {
            const totpSecret = speakeasy.generateSecret({ length: 20 });
            const otpauth_url = totpSecret.otpauth_url;

            try {
                const qrCodeDataURL = await generateQRCodeAsync(otpauth_url);

                // Save the secret to the user (optional: only after verification)
                user.totp_secret = totpSecret.base32;
                await user.save();

                return res.send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>🔐 TOTP Verification</title>
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                        <style>
                            body {
                                background-color: #f4f4f4;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                text-align: center;
                            }
                            .container {
                                background: white;
                                padding: 30px;
                                border-radius: 10px;
                                box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
                                max-width: 400px;
                                width: 100%;
                            }
                            img {
                                margin: 20px 0;
                                width: 200px;
                                height: 200px;
                            }
                            input, button {
                                width: 100%;
                                padding: 10px;
                                margin: 10px 0;
                                border-radius: 5px;
                                font-size: 16px;
                            }
                            button {
                                background-color: #007bff;
                                color: white;
                                border: none;
                                cursor: pointer;
                            }
                            button:hover {
                                background-color: #0056b3;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>🔒 Scan & Verify</h2>
                            <p>Scan this QR Code with Google Authenticator</p>
                            <img src="${qrCodeDataURL}" alt="TOTP QR Code">
                            <p>Then enter the 6-digit code from the app.</p>
                            <form action="/verify-totp" method="POST">
                                <input type="hidden" name="mobile_number" value="${req.body.mobile_number}">
                                <label for="totp_token">Enter TOTP Code:</label>
                                <input type="text" name="totp_token" pattern="\\d{6}" required placeholder="123456">
                                <button type="submit">Verify</button>
                            </form>
                        </div>
                    </body>
                    </html>
                `);
            } catch (err) {
                console.error("QR Code Generation Error:", err);
                return res.status(500).json({ error: "Failed to generate QR Code" });
            }
        }

        // Check Email Verification
        if (!user.email_verified) {
            req.session.email = user.email;
            console.log("Email not verified");
            return res.redirect("/verifyemail");
        }

        // Generate keys if missing
        if (!user.public_key || !user.encrypted_private_key) {
            console.log("Generating new cryptographic keys for user...");
            const { publicKey, privateKey } = generateRSAKeyPair();
            const aesKey = generateAESKey();
            const encryptedAESKey = encryptAESKey(publicKey, aesKey).toString("hex");
            const { encryptedData: encryptedPrivateKey, iv: ivPrivateKey } = encryptWithAES(aesKey, privateKey);

            user.public_key = publicKey;
            user.encrypted_private_key = JSON.stringify({ data: encryptedPrivateKey, iv: ivPrivateKey });
            user.encrypted_aes_key = encryptedAESKey;

            await user.save();
            console.log("Keys generated and stored successfully.");
        }

        // Save session and proceed
        req.session.user = user;

        totpMiddleware(req, res, function () {
            delete req.session.totp_verified;
            return res.redirect("/profile");
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.render("login");
    }
});






app.post("/register", upload.single("profile_picture"), formVailidation, async function (req, res) {
    if (req.session.user) {
        return res.redirect("/profile");
    }
    if (!req.file) {
        return res.status(500).json({ error: "Registration failed : nO file" });
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
            totp_secret: totpSecret.base32,
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
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>🔐 TOTP Verification</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                    <style>
                        body {
                            background-color: #f4f4f4;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        .container {
                            background: white;
                            padding: 30px;
                            border-radius: 10px;
                            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
                            max-width: 400px;
                            width: 100%;
                        }
                        img {
                            margin: 20px 0;
                            width: 200px;
                            height: 200px;
                        }
                        input {
                            width: 100%;
                            padding: 10px;
                            margin: 10px 0;
                            border-radius: 5px;
                            border: 1px solid #ddd;
                            font-size: 16px;
                            text-align: center;
                        }
                        button {
                            width: 100%;
                            padding: 10px;
                            background-color: #007bff;
                            color: white;
                            border: none;
                            font-size: 16px;
                            border-radius: 5px;
                            cursor: pointer;
                            transition: 0.3s ease;
                        }
                        button:hover {
                            background-color: #0056b3;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>🔒 Scan & Verify</h2>
                        <p>Scan this QR Code with Google Authenticator</p>
                        <img src="${qrCodeDataURL}" alt="TOTP QR Code">
                        <p>"${totpSecret.base32}</p>
                        <p>Once scanned, enter the 6-digit code from your app.</p>

                        <form action="/verify-totp" method="POST">
                            <input type="hidden" name="mobile_number" value="${req.body.mobile_number}">
                            <label for="totp_token">Enter TOTP Code:</label>
                            <input type="text" name="totp_token" pattern="\\d{6}" title="6-digit TOTP Code" required placeholder="123456">
                            <button type="submit">Verify</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
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



// Email Verification Route
app.post("/verifyemail", async (req, res) => {
    const { email, otp } = req.body;
    const storedOtpData = otpStorage[email];

    console.log("Email Verification Request:", email, otp, storedOtpData);

    try {
        const user = await Users.findOne({ email });

        if (!user) {
            return res.status(400).json({ error: "User not found." });
        }

        // No OTP found
        if (!storedOtpData) {
            return res.status(400).json({ error: "OTP not found or expired." });
        }

        // Check if OTP is expired
        if (Date.now() > storedOtpData.expiresAt) {
            delete otpStorage[email];
            return res.status(400).json({ error: "OTP has expired. Please request a new one." });
        }

        // Check attempt limit
        if (storedOtpData.attempts >= storedOtpData.maxAttempts) {
            delete otpStorage[email];
            return res.status(429).json({ error: "Too many incorrect attempts. OTP invalidated." });
        }

        // Check if OTP matches
        if (storedOtpData.code !== otp) {
            storedOtpData.attempts += 1;
            return res.status(400).json({
                error: `Incorrect OTP. ${storedOtpData.maxAttempts - storedOtpData.attempts} attempts left.`,
            });
        }

        // OTP correct
        user.email_verified = true;
        await user.save();

        delete otpStorage[email]; // Clear on success

        return res.redirect("/login");

    } catch (err) {
        console.error("Email Verification Error:", err);
        res.status(500).json({ error: "Email verification failed." });
    }
});









// app.post("/login", async function(req, res) {
//     if (req.session.user) {
//         return res.redirect("/profile");
//     }
//     console.log("Login Request:", req.body);



//     try {
//         // Find user by mobile number
//         const user = await Users.findOne({ mobile_number: req.body.mobile_number });



//         if (!user) {
//             console.log("No user found with this mobile number");
//             return res.redirect("/login");
//         }

//         const isMatch = await bcrypt.compare(req.body.password, user.password_hash);
//         if (!isMatch) {
//             console.log("Incorrect password");
//             return res.render("login");
//         }


//         if(user.is_suspended == true){
//             return res.send("You have been suspended. Please contact support. hihahah");
//             };



//         // Unable Once Your Accoundt Have been Revoked


//         const totpSecret = await speakeasy.generateSecret({ length: 20 });
//         if(!user.totp_secret){        
//             const otpauth_url = totpSecret.otpauth_url;
//             QRCode.toDataURL(otpauth_url, await function (err, qrCodeDataURL) {
//                 if (err) {
//                     console.error("QR Code Generation Error:", err);
//                     return res.status(500).json({ error: "Failed to generate QR Code" });
//                 }
//                 // Render a page with the QR code
//                 res.send(`
//                     <!DOCTYPE html>
//                     <html lang="en">
//                     <head>
//                         <meta charset="UTF-8">
//                         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                         <title>🔐 TOTP Verification</title>
//                         <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
//                         <style>
//                             body {
//                                 background-color: #f4f4f4;
//                                 display: flex;
//                                 justify-content: center;
//                                 align-items: center;
//                                 height: 100vh;
//                                 text-align: center;
//                             }
//                             .container {
//                                 background: white;
//                                 padding: 30px;
//                                 border-radius: 10px;
//                                 box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
//                                 max-width: 400px;
//                                 width: 100%;
//                             }
//                             img {
//                                 margin: 20px 0;
//                                 width: 200px;
//                                 height: 200px;
//                             }
//                             input {
//                                 width: 100%;
//                                 padding: 10px;
//                                 margin: 10px 0;
//                                 border-radius: 5px;
//                                 border: 1px solid #ddd;
//                                 font-size: 16px;
//                                 text-align: center;
//                             }
//                             button {
//                                 width: 100%;
//                                 padding: 10px;
//                                 background-color: #007bff;
//                                 color: white;
//                                 border: none;
//                                 font-size: 16px;
//                                 border-radius: 5px;
//                                 cursor: pointer;
//                                 transition: 0.3s ease;
//                             }
//                             button:hover {
//                                 background-color: #0056b3;
//                             }
//                         </style>
//                     </head>
//                     <body>
//                         <div class="container">
//                             <h2>🔒 Scan & Verify</h2>
//                             <p>Scan this QR Code with Google Authenticator</p>
//                             <img src="${qrCodeDataURL}" alt="TOTP QR Code">
//                             <p>Once scanned, enter the 6-digit code from your app.</p>

//                             <form action="/verify-totp" method="POST">
//                                 <input type="hidden" name="mobile_number" value="${req.body.mobile_number}">
//                                 <label for="totp_token">Enter TOTP Code:</label>
//                                 <input type="text" name="totp_token" pattern="\\d{6}" title="6-digit TOTP Code" required placeholder="123456">
//                                 <button type="submit">Verify</button>
//                             </form>
//                         </div>
//                     </body>
//                     </html>
//                 `);
//             });
//         }
//         if(user.email_verified == false){
//             req.session.email = user.email;
//             console.log("Email not verified");
//             return res.redirect("/verifyemail");
//             };
        

//         // Compare provided password with stored hash

//         console.log("User authenticated");

//         if (!user.public_key || !user.encrypted_private_key) {
//             console.log("Generating new cryptographic keys for user...");
//             const { publicKey, privateKey } = generateRSAKeyPair();
//             const aesKey = generateAESKey();
//             const encryptedAESKey = encryptAESKey(publicKey, aesKey).toString("hex");
//             const { encryptedData: encryptedPrivateKey, iv: ivPrivateKey } = encryptWithAES(aesKey, privateKey);
//             user.public_key = publicKey;
//             user.encrypted_private_key = JSON.stringify({ data: encryptedPrivateKey, iv: ivPrivateKey });
//             user.encrypted_aes_key = encryptedAESKey;
    
//             await user.save();
//             console.log("Keys generated and stored successfully.");
//         }

//         req.session.user = user;
//         totpMiddleware(req, res, function () {
           
//             delete req.session.totp_verified; // Clear session variable
//             res.redirect("/profile");
//         });

//     } catch (err) {
//         console.error("Login Error:", err);
//         res.render("login");
//     }
// });






// POST Update Profile
app.post("/profile/update", isLoggedIn,resetMiddleware,upload.single("profile_picture"), async (req, res) => {
    try {
        const userId = req.session.user.user_id; // Get UUID from session

        // Prepare updated user data
        req.boady = req.session.pendingFormData;
        const updatedData = {
            name: req.body.name,
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



// async function saveMediaDetails(req, file, fileType) {
//     console.log("Saving media details to database...");
//     console.log(req.session.user);

//     try {
//         let user_id = req.session.user.user_id;

//         const media = new Media({
//             media_id: Date.now(),
//             uploaded_user_id: user_id,
//             file_size: file.size,
//             file_type: fileType,
//             file_url: `/uploads/${fileType.toLowerCase()}s/${file.filename}`,
//             is_encrypted: false,
//             created_at: new Date(),
//             status: "Active"
//         });

//         await media.save();
//         console.log("Media saved to database:", media);
//     } catch (error) {
//         console.error(" Error saving media:", error);
//     }
// }


async function saveMediaDetails(req, file, fileType) {
    console.log("Saving media details to database...");
    console.log(req.session.user);

    try {
        const MAX_UPLOADS = 10; // Maximum number of uploads allowed per user
        let user_id = req.session.user.user_id;

        // **Check how many media files the user has already uploaded**
        const userUploadCount = await Media.countDocuments({ uploaded_user_id: user_id });

        if (userUploadCount >= MAX_UPLOADS) {
            console.error("Error: Upload limit reached.");
            return { error: "You cannot upload more than 10 media files." };
        }

        // Create a new media entry
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
        return { message: "Media successfully saved!", media };

    } catch (error) {
        console.error("Error saving media:", error);
        return { error: "Error saving media." };
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






// function formVailidation(req,res,next){

//     username =req.body.username
//     name =req.body.name
//     email =req.body.email
//     mobile_number = req.body.mobile_number
//     password = req.body.password
 

//     if( emailValidation(email)  && passwordVailidation(password)  && contactVailidation(mobile_number) && nameValidation(name)){
        
//         return next();
//     }

//     else{
//         console.log("Form Vailidation failed")
//         return res.send("Form Vailidation failed! Follow the rules and try again.");
//     }
// }




// function nameValidation(name){
//     console.log("Name:", name);
//     const nameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
//     if(nameRegex.test(name))
//     {
        
//         return true;
//     }
//     else
//     {
//         console.log("Name verification failed.")
//         return false;
//     }
// }

// function emailValidation(email){
//     var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
//     if(mailformat.test(email))
//     {
        
//         return true;
//     }
//     else
//     {
//         console.log("Email verification failed.")
//         return false;
//     }


// }

// function passwordVailidation(password){
//     const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*[a-zA-Z]).{8,}$/;
//     if(passwordRegex.test(password))
//     {
        
//         return true;
//     }
//     else
    
//     {
//         console.log("Password verification failed.", password)
//         return false;
//     }
// }

// function contactVailidation(contact){
//     const contactRegex = /[1-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]/;

//     if(contactRegex.test(contact))
//     {
        
//         return true;
//     }
//     else
//     {
//         console.log("Contact verification failed.")
//         return false;
//     }
// }



const allowedEmailDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "iiitd.ac.in"
  ];
  
  function formVailidation(req, res, next) {
    const { username, name, email, mobile_number, password } = req.body;
  
    // Username
    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        field: "username",
        error: "Username is required and should be at least 3 characters."
      });
    }
  
    // Name
    if (!nameValidation(name)) {
      return res.status(400).json({
        field: "name",
        error: "Name must contain only alphabets and allowed special characters (e.g., apostrophes, hyphens, dots)."
      });
    }
  
    // Email
    if (!emailValidation(email)) {
      return res.status(400).json({
        field: "email",
        error: `Invalid email format or domain not allowed. Accepted domains: ${allowedEmailDomains.join(", ")}`
      });
    }
  
    // Mobile Number
    if (!contactValidation(mobile_number)) {
      return res.status(400).json({
        field: "mobile_number",
        error: "Mobile number must be exactly 10 digits and start with digits 1-9."
      });
    }
  
    // Password
    if (!passwordValidation(password)) {
      return res.status(400).json({
        field: "password",
        error: "Password must be at least 8 characters, include an uppercase letter, lowercase letter, a number, and a special character."
      });
    }
  
    next();
  }
//  Name Validation (Only alphabets & some special characters like apostrophes)
function nameValidation(name) {
    console.log("Validating Name:", name);
    const nameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
    if (nameRegex.test(name)) {
        return true;
    } else {
        console.log(" Name validation failed.");
        return false;
    }
}

function emailValidation(email) {
    console.log("Validating Email:", email);
    const emailParts = email.split("@");
    if (emailParts.length !== 2) return false;
    const domain = emailParts[1].toLowerCase();
    return allowedEmailDomains.includes(domain);
  }


//  Password Validation (At least 8 chars, one uppercase, one lowercase, one number, one special character)
function passwordValidation(password) {
    console.log("Validating Password:", password);
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*[a-zA-Z]).{8,}$/;
    if (passwordRegex.test(password)) {
        return true;
    } else {
        console.log(" Password validation failed.");
        return false;
    }
}

//  Contact Validation (Exactly 10 digits, starts with 1-9)
function contactValidation(contact) {
    console.log("Validating Contact:", contact);
    const contactRegex = /^[1-9][0-9]{9}$/;
    if (contactRegex.test(contact)) {
        return true;
    } else {
        console.log(" Contact validation failed.");
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






// async function saveMediaDetails(req, file, fileType) {
//     console.log("Saving media details to database...");
//     console.log(req.session.user);

//     try {
//         let user_id = req.session.user.user_id;

//         // Check if user_id is a Buffer
//         if (Buffer.isBuffer(user_id)) {
//             // Convert Buffer to hex string and format it as a UUID
//             user_id = [
//                 user_id.toString("hex").slice(0, 8),
//                 user_id.toString("hex").slice(8, 12),
//                 user_id.toString("hex").slice(12, 16),
//                 user_id.toString("hex").slice(16, 20),
//                 user_id.toString("hex").slice(20)
//             ].join("-");
//         }

//         // Validate if the final string is a UUID
//         if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
//             throw new Error("Invalid UUID format after conversion.");
//         }

//         const media = new Media({
//             media_id: Date.now(), // Unique ID based on timestamp
//             uploaded_user_id: user_id, // Correctly formatted UUID
//             file_size: file.size,
//             file_type: fileType,
//             file_url: `/uploads/${fileType.toLowerCase()}s/${file.filename}`,
//             is_encrypted: false,
//             created_at: new Date(),
//             status: "Active"
//         });

//         await media.save();
//         console.log(" Media saved to database:", media);
//     } catch (error) {
//         console.error(" Error saving media:", error);
//     }
// }
// async function saveMediaDetails(req, file, fileType) {
//     console.log("Saving media details to database...");
//     console.log(req.session.user);

//     try {
//         const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
//         let user_id = req.session.user.user_id;

//         // Check if user_id is a Buffer and convert it to UUID format
//         if (Buffer.isBuffer(user_id)) {
//             user_id = [
//                 user_id.toString("hex").slice(0, 8),
//                 user_id.toString("hex").slice(8, 12),
//                 user_id.toString("hex").slice(12, 16),
//                 user_id.toString("hex").slice(16, 20),
//                 user_id.toString("hex").slice(20)
//             ].join("-");
//         }

//         // Validate UUID format
//         if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
//             throw new Error("Invalid UUID format after conversion.");
//         }

//         // **Check file size before saving**
//         if (file.size > MAX_FILE_SIZE) {
//             console.error("Error: File size exceeds limit.");
//             return { error: "File size exceeds the 5MB limit." };
//         }

//         // Save media details
//         const media = new Media({
//             media_id: Date.now(), // Unique ID based on timestamp
//             uploaded_user_id: user_id, // Correctly formatted UUID
//             file_size: file.size,
//             file_type: fileType,
//             file_url: `/uploads/${fileType.toLowerCase()}s/${file.filename}`,
//             is_encrypted: false,
//             created_at: new Date(),
//             status: "Active"
//         });

//         await media.save();
//         console.log("Media saved to database:", media);
//         return { message: "Media successfully saved!", media };

//     } catch (error) {
//         console.error("Error saving media:", error);
//         return { error: "Error saving media." };
//     }
// }

async function saveMediaDetails(req, file, fileType) {
    console.log("Saving media details to database...");
    console.log(req.session.user);

    try {
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
        const MAX_POSTS_PER_USER = 10; // Limit to 10 posts per user
        let user_id = req.session.user.user_id;

        // Convert Buffer to UUID format if needed
        if (Buffer.isBuffer(user_id)) {
            user_id = [
                user_id.toString("hex").slice(0, 8),
                user_id.toString("hex").slice(8, 12),
                user_id.toString("hex").slice(12, 16),
                user_id.toString("hex").slice(16, 20),
                user_id.toString("hex").slice(20)
            ].join("-");
        }

        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
            throw new Error("Invalid UUID format after conversion.");
        }

        // **Check if user has already posted 10 media files**
        const userPostCount = await Media.countDocuments({ uploaded_user_id: user_id });

        if (userPostCount >= MAX_POSTS_PER_USER) {
            console.error("Error: User has reached the media post limit.");
            return { error: "You cannot upload more than 10 media files." };
        }

        // **Check file size before saving**
        if (file.size > MAX_FILE_SIZE) {
            console.error("Error: File size exceeds limit.");
            return { error: "File size exceeds the 5MB limit." };
        }

        // Save media details
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
        console.log("Media saved to database:", media);
        return { message: "Media successfully saved!", media };

    } catch (error) {
        console.error("Error saving media:", error);
        return { error: "Error saving media." };
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
// app.listen(PORT, () => {
//     console.log('serever is live at  port  no: %s', PORT )
// });


app.post("*", async (req, res) => {
    res.status(500).send("hehehehhehe");
    
} );

server.listen(PORT, () => {
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

// async function sheed(req, res) {
//     try {
//         if (!req.file) {
//             return res.status(400).send("Image file is required.");
//         }
//         const user = await Users.findOne({ user_id: req.session.user.user_id });
//         req.session.user = user;

//         if (!user.advance_verified) {
//             return  res.status(403).send(" You are not verified to sell items.");
//         }

       


//         const items = {
//             name: req.body.name,
//             image: `/uploads/images/${req.file.filename}`, // Save image path
//             Quantity: 100,
//             price: req.body.price
//         };

//         console.log(items, "from sheed");

//         await Items.create(items);
//         res.send({ message: "Item successfully saved!", item: items });
//     } catch (err) {
//         console.error("Error saving item:", err);
//         res.status(500).send("Error saving item.");
//     }
// }

async function sheed(req, res) {
    try {
        if (!req.file) {
            return res.status(400).send("Image file is required.");
        }

        // Fetch the user from session
        const user = await Users.findOne({ user_id: req.session.user.user_id });
        req.session.user = user;

        if (!user.advance_verified) {
            return res.status(403).send("You are not verified to sell items.");
        }

        // Check how many items the user is already selling
        const userListingsCount = await Items.countDocuments({ seller_id: user.user_id });

        if (userListingsCount >= 10) {
            return res.status(403).send("You cannot sell more than 10 items.");
        }

        // Create a new item listing
        const newItem = new Items({
            seller_id: user.user_id,
            item_name: req.body.name,
            item_description: req.body.description || "",
            price: req.body.price,
            image_url: `/uploads/images/${req.file.filename}`, // Save image path
        });

        await newItem.save();
        res.send({ message: "Item successfully listed for sale!", item: newItem });

    } catch (err) {
        console.error("Error saving item:", err);
        res.status(500).send("Error saving item.");
    }
}







// ============================= Key Generation Part==================

// Generate a 2048-bit RSA key pair
function generateRSAKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
}

function generateAESKey() {
  return crypto.randomBytes(32);
}

// Encrypt the AES key with the RSA public key
function encryptAESKey(publicKey, aesKeyBuffer) {
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKeyBuffer
  );
}

// Decrypt the AES key with the RSA private key
function decryptAESKey(privateKey, encryptedAesKey) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    encryptedAesKey
  );
}
function encryptWithAES(aesKey, data) {
    const iv = crypto.randomBytes(16); // Initialization Vector
    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return { encryptedData: encrypted, iv: iv.toString("hex") };
  }
  function decryptWithAES(aesKey, encryptedData, iv) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
// (async () => {
//   // Generate RSA key pair
//   const { publicKey, privateKey } = generateRSAKeyPair();

//   // Generate AES key
//   const aesKey = generateAESKey();

//   // Encrypt the AES key with the RSA public key
//   const encryptedAesKey = encryptAESKey(publicKey, aesKey);
//   console.log("Encrypted AES Key:", encryptedAesKey.toString("hex"));

//   // Decrypt the AES key with the RSA private key
//   const decryptedAesKey = decryptAESKey(privateKey, encryptedAesKey);
//   console.log("Decrypted AES Key:", decryptedAesKey.toString("hex"));

//   // Verify that the decrypted AES key matches the original
//   if (!aesKey.equals(decryptedAesKey)) {
//     throw new Error("Decrypted AES key does not match the original");
//   }
// })();
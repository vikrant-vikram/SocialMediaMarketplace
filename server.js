
const cors = require("cors")
require("dotenv").config()
const path = require('path');
const express = require('express');
const app = express();
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const bcrypt = require('bcrypt');


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






var cookieParser = require('cookie-parser');
const body= require("body-parser");
let fs = require('fs');
const mongoose=require("mongoose");
const { Hash } = require("crypto");
// const { $where } = require("./models/users");


app.use(cors({
    origin: '*'
}));

// setting us some local verialbles
const  PORT = process.env.PORT ;

const DBSERVER=process.env.MONGOOSE_DBSERVER;


mongoose.connect(DBSERVER, {useNewUrlParser: true,useUnifiedTopology: true}).then(data=>{
    console.log("COnnected To Mongoose Database");
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


//mongoose.connect("mongoosedb://localhost/defarm");















const products = new Map([

    [1, {name:"Basic(Monthly)", Price:process.env.BASIC_ID, Features: "Basic Plan (Monthly): 1000sms/month"}],
    [2, {name: "SILVER_ID",Price:process.env.SILVER_ID, Features: "Basic Plan (Yearly): 1000sms/month"}],
    [3, {name:"GOLD_ID", Price:process.env.GOLD_ID, Features: "Preimium Plan (Monthly) : Unlimited sms/month"}],
    [4, {name:"DIAMOND_ID", Price:process.env.DIAMOND_ID, Features: "Premium Plan (Yearly) : Unlimited sms/month"}]
])

// setting up some handels

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(express.json());


app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));






// setting up some handels


// ================================================ Get Request ===================================================================================================

app.get('/', isLoggedIn, (req, res, next) => {
    res.render("profile")

});

app.get('/search', isLoggedIn, (req, res, next) => {
    res.render('search');
});


app.get('/chat',isLoggedIn, async (req, res, next) => {
    res.render('chat');
});
  
  
app.get("/profile",isLoggedIn,function (req, res) {
    res.render("profile");

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
        res.render("profile")
    }

    res.render("register");

});

app.get("/logout",isLoggedIn,function (req, res) {

    req.session.destroy();
    res.render("login");

});



app.get("/login" , function (req, res) {
    if(req.session.user){
        res.render("profile")
    }
    console.log("/login-page accerss")
    res.render("login");
    
});



app.get("*", function (req, res) {
    res.render("bazinga");
});




// ================================================================ Post Request ===================================================================================================



app.post('/purchase',isLoggedIn, async (req, res, next) => {
    try {
        const item = products.get(parseInt(req.body.plan))
        console.log(item)
        const session = await stripe.checkout.sessions.create({
            payment_method_types:["card"],
            mode:"subscription",
            currency: 'inr',
            line_items:[{

                price: item.Price,
                quantity:1
            
            }],
            success_url: `${process.env.SERVER_URL}/success`,
            cancel_url: `${process.env.SERVER_URL}/cancel`
  
        })
        res.redirect(session.url)
        console.log(session)


        
    } catch (error) {
        console.log(error);
        res.render("bazinga")
        
    }


});




app.post("/register", formVailidation, async function( req,res) {
    

    // Have Not implemented the Hashing of password yet

    if(req.session.user){
        res.render("profile")
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
        return res.render("profile");
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
        res.render("profile");

    } catch (err) {
        console.error("Login Error:", err);
        res.render("login");
    }
});















// ================================================================ Handler Functions ===================================================================================================


app.listen(PORT, () => {
    console.log('serever is live at  port  no: %s', PORT )
});










function formVailidation(req,res,next){
    return next();
    usersname=req.body.name
    email=req.body.email
    password=req.body.password
    pan_number=req.body.pan_number
    contact_number=req.body.contact_number
    subscription_type=req.body.subscription_type,
    business_name=req.body.business_name,
    business_webiste=req.body.business_webiste
 

    if(nameValidation(usersname)&& emailValidation(email)  && passwordVailidation(password)  && panVailidation(pan_number) && contactVailidation(contact_number) && nameValidation(business_name)  && websiteVailidation(business_webiste)){
        
        return next();
    }

    else{

        // console.log(nameValidation(usersname))
        // console.log(emailValidation(email))

        // console.log(passwordVailidation(password))

        // console.log(panVailidation(pan_number))

        // console.log(contactVailidation(contact_number))

        // console.log(websiteVailidation(business_webiste))

        // console.log(nameValidation(business_name))

        // console.log(email)
        console.log("Form Vailidation failed")
        res.render("register");
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
        res.render("profile");
        
    }
    return next();
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
        console.log("name verification failed")
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
        console.log("Email verification failed")
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
        console.log("password verification failed")
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
        console.log("contact verification failed")
        return false;
    }
}

function websiteVailidation(website){
    const websiteRegex = /^(http(s)?:\/\/)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,})(\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/;
    if(websiteRegex.test(website))
    {
        
        return true;
    }
    else
    {
        console.log("waebsite verification failed")
        return false;
    }

}








async function createHash(password) {
    const saltRounds = 10;
    password_hash = await bcrypt.hash(password, saltRounds);
    console.log("Hashing have been done")
    return password_hash;

}
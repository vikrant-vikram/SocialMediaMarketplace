const mongoose = require("mongoose");

var user= mongoose.Schema({
    username:String,
    password:String,
    name:String,
    email:String,
    pan_number:String,
    contact_number:String,
    subscription_type:String,
    address:String,
    business_name:String,
    Business_webiste:String,
    msg_left:String,
    active:String,
    Other:String
});

module.exports=mongoose.model("users",user);
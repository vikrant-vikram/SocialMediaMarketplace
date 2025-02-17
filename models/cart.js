
const mongoose = require("mongoose");

var cart= mongoose.Schema({
    username:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users"
    },
    itemname:String,
    quantity:Number
});

module.exports=mongoose.model("cart",cart);
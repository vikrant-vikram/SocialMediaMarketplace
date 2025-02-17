
const mongoose = require("mongoose");

var item= mongoose.Schema({
    name:String,
    image:String,
    quantity:Number,
    price:Number
});

module.exports=mongoose.model("items",item);
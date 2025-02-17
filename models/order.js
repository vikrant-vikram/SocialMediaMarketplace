
const mongoose = require("mongoose");

var order= mongoose.Schema({
    username:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users"
    },
    name:String,
    type:String,
    itemname:String,
    quantity:Number,
    orderdate:{
        type:Date,
        default:Date.now

    },
    deliverydate:Date,
    price:Number,
    address1:String,
    address2:String,
    address3:String,
    address4:String,
    address5:String,
    contact:Number,
    zip:Number,
    lat:Number,
    lon:Number
    
});

module.exports=mongoose.model("orders",order);
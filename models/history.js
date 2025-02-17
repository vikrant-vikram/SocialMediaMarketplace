
const mongoose = require("mongoose");

var history= mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"users"
    },
    item:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"items"

    },
    price:Number,
    Quantity:Number,
    history_date:Date 
});

module.exports=mongoose.model("history",history);
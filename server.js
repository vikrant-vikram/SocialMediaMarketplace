
const path = require('path');
const express = require('express');
const app = express();

// setting us some local verialbles

const  PORT = 8080;

// setting up some handels

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));



app.get('/', (req, res, next) => {
    res.render('index');
});


  


app.listen(PORT, () => {
    console.log('serever is live at  port  no: %s', PORT )
});
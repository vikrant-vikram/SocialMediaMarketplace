function addToCart(data)
{
    console.log("add to cart");
    console.log(data);
    var text=$("#"+data).html();
    if(text!="remove")
    {
        var q=$("#"+data+"q").val();
        alert(q);
        if(q)
            $.ajax({
                type: "get",
                url: "/addToCart/"+data+"/"+q,
                success: function (response) {
                    if(response=="true" || response!="error")
                    $("#"+data).html("remove");
                    else 
                        alert("some error occured pls try after some time");
                    
                }
            });


    }
    else{
        $.ajax({
            type: "get",
            url: "/cart/remove/"+data,
            success: function (response) {
                if(response=="true")
                {
                    $("#"+data).html("add to cart");
                }
                else alert("pls try after some time")
                
            }
        })

    }
}



function removecart(data)
{

$.ajax({
    type: "get",
    url: "/cart/remove/"+data,
    success: function (response) {
        if(response=="true")
        {
            $("#"+data).remove();
        }
        else alert("pls try after some time")
        
    }
})
    
   
}

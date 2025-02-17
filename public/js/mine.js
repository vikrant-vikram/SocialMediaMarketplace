
        // You can also use"$(window).load(function() {"
        $(function () {
            // Slideshow 4
            $("#slider3").responsiveSlides({
                auto: true,
                pager: true,
                nav: false,
                speed: 500,
                namespace: "callbacks",
                before: function () {
                    $('.events').append("<li>before event fired.</li>");
                },
                after: function () {
                    $('.events').append("<li>after event fired.</li>");
                }
            });

        });

		$(() => {

		  //On Scroll Functionality
		  $(window).scroll(() => {
			var windowTop = $(window).scrollTop();
			windowTop > 100 ? $('nav').addClass('navShadow') : $('nav').removeClass('navShadow');
			windowTop > 100 ? $('ul.nav-agile').css('top', '50px') : $('ul.nav-agile').css('top', '160px');
		  });

		  //Click Logo To Scroll To Top
		  $('#logo').on('click', () => {
			$('html,body').animate({
			  scrollTop: 0
			}, 500);
		  });

		  $('#menu-toggle').on('click', () => {
			$('#menu-toggle').toggleClass('closeMenu');
			$('ul').toggleClass('showMenu');

			$('li').on('click', () => {
			  $('ul').removeClass('showMenu');
			  $('#menu-toggle').removeClass('closeMenu');
			});
		  });

		});

	
        // jQuery(document).ready(function ($) {
        //     $(".scroll").click(function (event) {
        //         event.preventDefault();
        //         $('html,body').animate({
        //             scrollTop: $(this.hash).offset().top
        //         }, 900);
        //     });
        // });
        // $(document).ready(function () {

        //     $().UItoTop({
        //         easingType: 'easeOutQuart'
        //     });

        // });
        // addEventListener("load", function () {
        //     setTimeout(hideURLbar, 0);
        // }, false);

        // function hideURLbar() {
        //     window.scrollTo(0, 1);
        // }
  
/*! Plugin options and other jQuery stuff */

// dl-menu options
$(function() {
  $( '#dl-menu' ).dlmenu({
    animationClasses : { classin : 'dl-animate-in', classout : 'dl-animate-out' }
  });
});

// FitVids options
$(function() {
  $("article").fitVids();
});

$(".close-menu").click(function () {
  $(".menu").toggleClass("disabled");
  $(".links").toggleClass("enabled");
});

$(".about").click(function () {
  $("#about").css('display','block');
});

$(".close-about").click(function () {
  $("#about").css('display','');
});

// Add lightbox class to all image links
$("a[href$='.jpg'],a[href$='.jpeg'],a[href$='.JPG'],a[href$='.png'],a[href$='.gif'],a[href$='.svg']").addClass("image-popup");
$("img[src^='/']").click(function() {window.location.href = this.src})

// Magnific-Popup options
$(document).ready(function() {
  $('.image-popup').magnificPopup({
    type: 'image',
    tLoading: 'Loading image #%curr%...',
    gallery: {
      enabled: true,
      navigateByImgClick: true,
      preload: [0,1] // Will preload 0 - before current, and 1 after the current image
    },
    image: {
      tError: '<a href="%url%">Image #%curr%</a> could not be loaded.',
    },
    removalDelay: 50, // Delay in milliseconds before popup is removed
    // Class that is added to body when popup is open.
    // make it unique to apply your CSS animations just to this exact popup
    mainClass: 'mfp-fade'
  });
});

// header
$(document).ready(function(e) {
  $(window).scroll(function(){
    var header = $('.header-menu');
    var scroll = $(window).scrollTop();
    if(scroll > 300){
      header.attr('class', 'header-menu header-menu-overflow');
    } else {
      header.attr('class', 'header-menu header-menu-top');
    }
  });
});

//mobile menu
$(document).ready(function(){
  $("#menu").attr('style', '');
  $("#menu").mmenu({
    "extensions": [
      "border-full",
      "effect-zoom-menu",
      "effect-zoom-panels",
      "pageshadow",
      "theme-dark"
    ],
    "counters": true,
    "navbars": [
      {
        "position": "bottom",
        "content": [
          "<a class='fa fa-search' href='/search'></a>",
          "<a class='fa fa-envelope' href='#/'></a>",
          "<a class='fa fa-twitter' href='#/'></a>",
          "<a class='fa fa-facebook' href='#/'></a>"
        ]
      }
    ]
  });
});

var sharing = function(){
    $(document).ready(function(){
      $("body").floatingSocialShare({
        buttons: ["facebook","twitter","google-plus", "linkedin", "pinterest"],
        text: "Share with "
      });
    });
};//sharing

// jump/scroll with offset
$(document).ready(function() {
  var scroll_time_ms = 600;
  var top_offset = 80;
  var foo = function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'')
        && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top - top_offset //offsets for fixed header
        }, scroll_time_ms);
        return false;
      }
    }
  };
  // modifiy all href click behavior
  // https://api.jquery.com/category/selectors/
  // TODO: add markdown generated anchor ref
  $("#markdown-toc").find('a[href^="#"]').click(foo);
  $("#__table-of-contents").find('a[href^="#"]').click(foo);
  // Executed on page load with URL containing an anchor tag.
  if($(location.href.split("#")[1])) {
    var target = $('#'+location.href.split("#")[1]);
    if (target.length) {
      $('html,body').animate({
          scrollTop: target.offset().top - top_offset //offsets for fixed header
      }, scroll_time_ms);
      return false;
    }
  }
});
// end of TOC jump/scroll with offset

// vim: et tw=80 ts=2 sw=2 cc=80:

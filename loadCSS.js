$(document).ready(function() {
    $("#nav li a").click(function() {
        $("link").attr("href",$(this).attr('rel'));
        return false;
    });
});
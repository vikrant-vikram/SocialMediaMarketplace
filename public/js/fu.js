var $yes = document.querySelector(".option--yes");
var $no = document.querySelector(".option--no");
var $title = document.querySelector(".title");

$yes.addEventListener("click", changeText);
$no.addEventListener("click", changeText);

function changeText(e) {
  $yes.style.display = "none";
  $no.style.display = "none";
  if (this == $yes) {
    $title.innerHTML = "STAY AT HOME!";
  } else if (this == $no) {
    $title.innerHTML = "FUCK YOU!";
  }
}

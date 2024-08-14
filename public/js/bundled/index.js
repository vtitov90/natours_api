const e=()=>{let e=document.querySelector(".alert");e&&e.remove()},t=(t,o)=>{e();let a=`<div class="alert alert--${t}">${o}</div>`;document.querySelector("body").insertAdjacentHTML("afterbegin",a),window.setTimeout(e,3e3)},o=async(e,o)=>{try{let a=await axios({method:"POST",url:"http://localhost:3000/api/v1/users/login",data:{email:e,password:o}});"success"===a.data.status&&(t("success","Logged in successfully"),window.setTimeout(()=>{location.assign("/")},700))}catch(e){t("error",e.response.data.message)}},a=async()=>{try{let e=await axios({method:"GET",url:"http://localhost:3000/api/v1/users/logout"});"success"===e.data.status&&location.reload(!0)}catch(e){t("error","Error logging out! Try again.")}},s=async(e,o,a,s)=>{try{let n=await axios({method:"POST",url:"http://localhost:3000/api/v1/users/signup",data:{name:e,email:o,password:a,passwordConfirm:s}});"success"===n.data.status&&(t("success","Signed up successfully"),window.setTimeout(()=>{location.assign("/")},700))}catch(e){t("error",e.response.data.message)}},n=async(e,o)=>{try{let a="password"===o?"http://localhost:3000/api/v1/users/updateMyPassword":"http://localhost:3000/api/v1/users/updateMe",s=await axios({method:"PATCH",url:a,data:e});"success"===s.data.status&&(t("success",`${o.toUpperCase()} updated successfully!`),window.setTimeout(()=>{location.reload()},700))}catch(e){t("error",e.response.data.message)}},r=async e=>{try{let t=await axios(`/api/v1/bookings/checkout-session/${e}`);location.assign(t.data.session.url)}catch(e){var o;console.error("Booking error:",e),t("error",(null===(o=e.response)||void 0===o?void 0:o.status)===409?"You have already booked this tour":"An error occurred while booking the tour")}},d=document.getElementById("map"),l=document.querySelector(".form--login"),c=document.querySelector(".nav__el--logout"),u=document.querySelector(".form-user-data"),i=document.querySelector(".form-user-password"),m=document.getElementById("book-tour");d&&(e=>{mapboxgl.accessToken="pk.eyJ1IjoidnRpdG92OTAiLCJhIjoiY2x2YXVsZDhyMDJrdjJqbnZ3dDMwaGx0YSJ9.TWHnYaB5878fjLQDh8opzQ";let t=new mapboxgl.Map({container:"map",style:"mapbox://styles/vtitov90/clvawxa4g00s601ph86vp77n2",scrollZoom:!1}),o=new mapboxgl.LngLatBounds;e.forEach(e=>{let a=document.createElement("div");a.className="marker",new mapboxgl.Marker({element:a,anchor:"bottom"}).setLngLat(e.coordinates).addTo(t),new mapboxgl.Popup({offset:30,focusAfterOpen:!1}).setLngLat(e.coordinates).setHTML(`<p>Day ${e.day}: ${e.description}</p>`).addTo(t),o.extend(e.coordinates)}),t.fitBounds(o,{padding:{top:200,bottom:150,left:100,right:100}})})(JSON.parse(d.dataset.locations)),l&&l.addEventListener("submit",function(e){e.preventDefault();let t=document.getElementById("password").value,a=document.getElementById("email").value;document.getElementById("name")&&document.getElementById("confirm-password")?s(document.getElementById("name").value,a,t,document.getElementById("confirm-password").value):o(a,t)}),c&&c.addEventListener("click",a),u&&u.addEventListener("submit",e=>{e.preventDefault();let t=new FormData;t.append("name",document.getElementById("name").value),t.append("email",document.getElementById("email").value),t.append("photo",document.getElementById("photo").files[0]),console.log(t),n(t,"data")}),i&&i.addEventListener("submit",async e=>{e.preventDefault(),document.querySelector(".btn--save-password").textContent="Updating...";let t=document.getElementById("password-current").value,o=document.getElementById("password").value,a=document.getElementById("password-confirm").value;await n({passwordCurrent:t,password:o,passwordConfirm:a},"password"),document.querySelector(".btn--save-password").textContent="Save password",document.getElementById("password-current").value="",document.getElementById("password").value="",document.getElementById("password-confirm").value=""}),m&&m.addEventListener("click",e=>{e.target.textContent="Processing...";let{tourId:t}=e.target.dataset;r(t)});
//# sourceMappingURL=index.js.map

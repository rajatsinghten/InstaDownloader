
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const isLocalHost = LOCAL_HOSTS.has(window.location.hostname);

window.INSTA_API_URL = isLocalHost
	? window.location.origin
	: "https://instadownloader-57m8.onrender.com";

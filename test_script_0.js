
    window.addEventListener("error", function(e) {
      fetch("/api/debug?err="+encodeURIComponent(e.message+" | "+e.filename+":"+e.lineno));
    });
    window.addEventListener("unhandledrejection", function(e) {
      fetch("/api/debug?err="+encodeURIComponent(e.reason));
    });
    
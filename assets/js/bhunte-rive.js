// GharBhunte — one interactive Rive Bhunte, shared by every page.
//
// The live pet lives in a single published file, assets/rive/bhunte.riv.
// Each page mounts its own independent copy of him into a <canvas> placed
// next to its static <img> (the img is the fallback). When the .riv loads,
// the canvas shows and the img hides; when it fails (no .riv published
// yet, offline, runtime blocked), the static image stays and nothing
// breaks. The page's own tap behaviour (voice, bark) is passed in as
// onTap; the Rive state machine ("Pet") already fires its Pet animation
// on a canvas tap, and celebrate()/pet() fire the triggers from code.
//
// State machine "Pet" — triggers: celebrate, pet.
// The artboard has no background fill, so the canvas is transparent and
// Bhunte shows on the page behind it (the room), not in a card.
(function () {
  var RIV_SRC = "assets/rive/bhunte.riv";
  var STATE_MACHINE = "Pet";

  function mount(imgId, opts) {
    opts = opts || {};
    var img = document.getElementById(imgId);
    // No-op handle: the page keeps working on its static image.
    var api = { ready: false, celebrate: function () {}, pet: function () {} };
    if (!img) return api;
    if (!window.rive || !window.rive.Rive) return api;

    var canvas = document.createElement("canvas");
    canvas.id = imgId + "-rive";
    canvas.className = img.className; // same sizing/positioning as the img
    canvas.width = 500;
    canvas.height = 500;
    canvas.setAttribute("aria-label", img.getAttribute("alt") || "Bhunte the dog");
    canvas.style.cursor = "pointer";
    // No background or border-radius: the .riv artboard is transparent,
    // so Bhunte shows on the page behind the canvas (the room), not in
    // a cream card.
    canvas.style.display = "none"; // shown only once the .riv has loaded
    img.parentNode.insertBefore(canvas, img.nextSibling);

    var r = null;
    var pendingCelebrate = false;

    function fire(name) {
      if (!api.ready || !r) return;
      try {
        var inputs = r.stateMachineInputs(STATE_MACHINE) || [];
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i].name === name) { inputs[i].fire(); return; }
        }
      } catch (e) {}
    }
    api.celebrate = function () {
      if (api.ready) fire("celebrate");
      else pendingCelebrate = true; // fire it once the .riv arrives
    };
    api.pet = function () { fire("pet"); };
    // Re-sync the Rive drawing surface to the canvas's current size.
    // Must run AFTER the canvas is visible and sized — resizing while it
    // is display:none gives a 0x0 surface and the dog never draws.
    api.resize = function () {
      try { if (r) r.resizeDrawingSurfaceToCanvas(); } catch (e) {}
    };

    try {
      r = new window.rive.Rive({
        src: RIV_SRC,
        canvas: canvas,
        stateMachine: STATE_MACHINE,
        autoplay: true,
        autoBind: true,
        onLoad: function () {
          api.ready = true;
          // Show the canvas only if the img is currently visible (a page
          // may hide its dog, e.g. My Ghar's mission lock), then hide
          // the img so only the live dog shows.
          canvas.style.display = img.style.display === "none" ? "none" : "";
          img.style.display = "none";
          // Resize AFTER the canvas is visible and has a size. Resizing
          // while it is display:none gives a 0x0 surface and the dog
          // never draws (the canvas stays blank).
          try { r.resizeDrawingSurfaceToCanvas(); } catch (e) {}
          if (pendingCelebrate) { pendingCelebrate = false; fire("celebrate"); }
          if (opts.onReady) opts.onReady(api);
        },
        onLoadError: function () {
          // No .riv yet (or it failed) — keep the static image.
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          img.style.display = "";
          if (opts.onError) opts.onError();
        },
      });
    } catch (e) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      img.style.display = "";
      return api;
    }

    // Tapping the live dog fires Pet (the state machine also has a
    // built-in tap listener) and runs the page's tap behaviour.
    canvas.addEventListener("click", function () {
      api.pet();
      if (opts.onTap) opts.onTap();
    });
    return api;
  }

  window.GharBhunte = { mount: mount };
})();

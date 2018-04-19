var that = this;
function run (key, context) {
  that.context = context;

var exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports['default'] = function (context) {
  var videoPath = promptForVideoFile(context);
  if (!videoPath) {
    log('No video file selected');
    return;
  }
  insertVideo(context, videoPath);
};

exports.onOpenDocument = onOpenDocument;

var _sketchPolyfillSetinterval = __webpack_require__(1);

var gifMeVideoDataKey = 'gif.me.video.data';
var gifMeVideoNameKey = 'gif.me.video.name';
var gifMePluginKey = 'gif.me.plugin';

var videoLayers = [];
var animateLoopStarted = false;

/**
 * @param {MSLayer} layer
 * @param [{NSImage}] frames
 */
function startVideoLayer(layer, frames) {
  var fill = layer.style().fills().firstObject();
  log('Fill (phil) is:');
  log(fill);
  if (!fill) {
    fill = layer.style().addStylePartOfType(0);
  }
  fill.setFillType(4);
  fill.setPatternFillType(1);
  videoLayers.push({
    layer: layer,
    fill: fill,
    frames: frames,
    index: 0
  });
  if (!animateLoopStarted) {
    log('starting video loop');
    (0, _sketchPolyfillSetinterval.setInterval)(function () {
      for (var i = 0; i < videoLayers.length; i++) {
        var vl = videoLayers[i];
        vl.index = (vl.index + 1) % vl.frames.length;
        vl.fill.setImage(vl.frames[vl.index]);
      }
    }, 40);
    animateLoopStarted = true;
  }
}

function promptForVideoFile(context) {
  var openPanel = NSOpenPanel.openPanel();
  openPanel.setCanChooseFiles(true);
  openPanel.setCanChooseDirectories(false);
  openPanel.setAllowsMultipleSelection(false);
  var clicked = openPanel.runModal();

  if (clicked == NSFileHandlingPanelOKButton) {
    var urls = openPanel.URLs();
    if (urls.count() > 0) {
      return urls[0].path();
    }
  }
}

function insertVideo(context, videoPath, layer, skipSave) {
  var outputDir = exportFrames(videoPath);
  if (!outputDir) {
    log('Failed to export frames');
    return;
  }
  log('Exported frames to ' + outputDir);

  var count = NSFileManager.defaultManager().contentsOfDirectoryAtPath_error(outputDir, null).count();

  var frames = [];
  for (var i = 1; i <= count; i++) {
    var framePath = outputDir + '/' + i + '.jpg';
    var nsImage = NSImage.alloc().initByReferencingFile(framePath);
    frames.push(MSImageData.alloc().initWithImage(nsImage));
  }

  // if no layer is passed in, get the currently selected layer, or create a new one
  if (!layer) {
    var layers = context.document.selectedLayers().layers();
    layer = layers.count() > 0 ? layers[0] : createRectangle(context, frames[0].image().size());
  }

  startVideoLayer(layer, frames);

  if (!skipSave) {
    storeVideoOnLayer(context, layer, videoPath);
  }
}

function exportFrames(filePath) {
  var outDir = tempDir('frames');

  NSFileManager.defaultManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(outDir, true, null, null);

  var pattern = outDir + '/%d.jpg';
  var task = NSTask.alloc().init();
  task.setLaunchPath("/usr/local/bin/ffmpeg");
  task.setArguments(["-i", filePath, "-r", "25.0", pattern]);
  var outputPipe = NSPipe.pipe();
  task.setStandardOutput(outputPipe);
  task.launch();

  var outputData = outputPipe.fileHandleForReading().readDataToEndOfFile();
  var outputString = NSString.alloc().initWithData_encoding(outputData, NSUTF8StringEncoding);

  return outDir;
}

function tempDir(name) {
  name = name || '';
  // FIXME
  var tmp = NSTemporaryDirectory() + 'sketch-video-plugin/' + name + randomInt(9999999) + '/';
  NSFileManager.defaultManager().createDirectoryAtPath_withIntermediateDirectories_attributes_error(tmp, true, null, null);
  return tmp;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function createRectangle(context, nsSize) {
  var scrollOrigin = context.document.currentView().scrollOrigin();
  var contentRect = context.document.currentView().visibleContentRect();
  var width = nsSize.width;
  var height = nsSize.height;
  var rect = NSMakeRect(contentRect.origin.x + (contentRect.size.width - width) / 2, contentRect.origin.y + (contentRect.size.height - height) / 2, width, height);
  var shape = MSRectangleShape.alloc().initWithFrame(rect);
  var shapeGroup = MSShapeGroup.shapeWithPath(shape);
  shapeGroup.style().addStylePartOfType(0);
  context.document.currentPage().addLayer(shapeGroup);
  return shapeGroup;
}

function storeVideoOnLayer(context, layer, videoPath) {
  var data = NSData.dataWithContentsOfFile(videoPath);
  data = data.base64EncodedDataWithOptions(null);
  data = NSString.alloc().initWithData_encoding(data, NSUTF8StringEncoding);
  context.command.setValue_forKey_onLayer_forPluginIdentifier(data, gifMeVideoDataKey, layer, gifMePluginKey);
  var fileName = videoPath.substring(videoPath.lastIndexOf('/') + 1);
  log('Saving video data for ' + fileName + ' on ' + layer);
  context.command.setValue_forKey_onLayer_forPluginIdentifier(fileName, gifMeVideoNameKey, layer, gifMePluginKey);
}

function onOpenDocument(context) {
  // FIXME: For some reason, the child layers are not present when
  // OpenDocument is triggered. So let's wait an arbitrary amount
  // of time before checking for videos.
  // FIXME: note we can't use setTimeout here, or clear the interval, because
  // it kills to COScript after running, which stops the animation.
  var done = false;
  (0, _sketchPolyfillSetinterval.setInterval)(function () {
    if (!done) {
      var document = context.document || context.actionContext.document;
      if (document) {
        var pages = document.pages();
        for (var i = 0; i < pages.count(); i++) {
          var children = pages[i].children();
          for (var j = 0; j < children.count(); j++) {
            loadVideoForLayer(context, children[j]);
          }
        }
      }
      done = true;
    }
  }, 1000);
}

function loadVideoForLayer(context, layer) {
  var fileName = context.command.valueForKey_onLayer_forPluginIdentifier(gifMeVideoNameKey, layer, gifMePluginKey);
  var data = context.command.valueForKey_onLayer_forPluginIdentifier(gifMeVideoDataKey, layer, gifMePluginKey);
  if (fileName && data) {
    log('Found video ' + fileName + ' on layer ' + layer);
    data = NSData.alloc().initWithBase64EncodedString_options(data, null);
    var videoPath = tempDir('video') + fileName;
    data.writeToFile_atomically(videoPath, false);
    insertVideo(context, videoPath, layer, true);
  }
}

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/* globals coscript */

var ids = []

function setInterval (func, delay, param1, param2, param3, param4, param5, param6, param7, param8, param9, param10) {
  coscript.shouldKeepAround = true
  var id = ids.length
  ids.push(true)
  function trigger () {
    coscript.scheduleWithInterval_jsFunction(
      (delay || 0) / 1000,
      function () {
        if (ids[id]) { // if not cleared
          func(param1, param2, param3, param4, param5, param6, param7, param8, param9, param10)
          trigger()
        }
      }
    )
  }
  trigger()
  return id
}

function clearInterval (id) {
  ids[id] = false
  if (ids.every(function (_id) { return !_id })) { // if everything is cleared
    coscript.shouldKeepAround = false
  }
}

// polyfill the global object
var commonjsGlobal = typeof global !== 'undefined'
  ? global
  : this

commonjsGlobal.setInterval = commonjsGlobal.setInterval || setInterval
commonjsGlobal.clearInterval = commonjsGlobal.clearInterval || clearInterval

module.exports = {
  setInterval: setInterval,
  clearInterval: clearInterval
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(2)))

/***/ }),
/* 2 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ })
/******/ ]);
  if (key === 'default' && typeof exports === 'function') {
    exports(context);
  } else {
    exports[key](context);
  }
}
that['onRun'] = run.bind(this, 'default');
that['onOpenDocument'] = run.bind(this, 'onOpenDocument')

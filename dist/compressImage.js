(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.compressImage = factory());
}(this, (function () { 'use strict';

/**
 * @file 兼容toBlob
 * @author kaivean(kaisey2012@163.com)
 */

function ployFillTobBlob() {
    /*
     * JavaScript Canvas to Blob
     * https://github.com/blueimp/JavaScript-Canvas-to-Blob
     *
     * Copyright 2012, Sebastian Tschan
     * https://blueimp.net
     *
     * Licensed under the MIT license:
     * https://opensource.org/licenses/MIT
     *
     * Based on stackoverflow user Stoive's code snippet:
     * http://stackoverflow.com/q/4998908
     */

    /* global atob, Blob, define */

    (function (window) {
      'use strict';

      var CanvasPrototype = window.HTMLCanvasElement &&
                              window.HTMLCanvasElement.prototype;
      var hasBlobConstructor = window.Blob && (function () {
        try {
          return Boolean(new Blob())
        } catch (e) {
          return false
        }
      }());
      var hasArrayBufferViewSupport = hasBlobConstructor && window.Uint8Array &&
        (function () {
          try {
            return new Blob([new Uint8Array(100)]).size === 100
          } catch (e) {
            return false
          }
        }());
      var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                          window.MozBlobBuilder || window.MSBlobBuilder;
      var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;
      var dataURLtoBlob = (hasBlobConstructor || BlobBuilder) && window.atob &&
        window.ArrayBuffer && window.Uint8Array &&
        function (dataURI) {
          var matches,
            mediaType,
            isBase64,
            dataString,
            byteString,
            arrayBuffer,
            intArray,
            i,
            bb;
          // Parse the dataURI components as per RFC 2397
          matches = dataURI.match(dataURIPattern);
          if (!matches) {
            throw new Error('invalid data URI')
          }
          // Default to text/plain;charset=US-ASCII
          mediaType = matches[2]
            ? matches[1]
            : 'text/plain' + (matches[3] || ';charset=US-ASCII');
          isBase64 = !!matches[4];
          dataString = dataURI.slice(matches[0].length);
          if (isBase64) {
            // Convert base64 to raw binary data held in a string:
            byteString = atob(dataString);
          } else {
            // Convert base64/URLEncoded data component to raw binary:
            byteString = decodeURIComponent(dataString);
          }
          // Write the bytes of the string to an ArrayBuffer:
          arrayBuffer = new ArrayBuffer(byteString.length);
          intArray = new Uint8Array(arrayBuffer);
          for (i = 0; i < byteString.length; i += 1) {
            intArray[i] = byteString.charCodeAt(i);
          }
          // Write the ArrayBuffer (or ArrayBufferView) to a blob:
          if (hasBlobConstructor) {
            return new Blob(
              [hasArrayBufferViewSupport ? intArray : arrayBuffer],
              {type: mediaType}
            )
          }
          bb = new BlobBuilder();
          bb.append(arrayBuffer);
          return bb.getBlob(mediaType)
        };
      if (window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
        if (CanvasPrototype.mozGetAsFile) {
          CanvasPrototype.toBlob = function (callback, type, quality) {
            if (quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
              callback(dataURLtoBlob(this.toDataURL(type, quality)));
            } else {
              callback(this.mozGetAsFile('blob', type));
            }
          };
        } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
          CanvasPrototype.toBlob = function (callback, type, quality) {
            callback(dataURLtoBlob(this.toDataURL(type, quality)));
          };
        }
      }
      if (typeof define === 'function' && define.amd) {
        define(function () {
          return dataURLtoBlob
        });
      } else if (typeof module === 'object' && module.exports) {
        module.exports = dataURLtoBlob;
      } else {
        window.dataURLtoBlob = dataURLtoBlob;
      }
    }(window));
}

/**
 * @file 获取方位
 * @author kaivean(kaisey2012@163.com)
 */

function getStringFromDB(buffer, start, length) {
    var outstr = "";
    for (var n = start; n < start+length; n++) {
        outstr += String.fromCharCode(buffer.getUint8(n));
    }
    return outstr;
}
function readOrientation(dataView, e1Offset) {
    if (getStringFromDB(dataView, e1Offset, 4) != "Exif") {
        return false;
    }
    var tiffOffset = e1Offset + 6;
    var bigEnd = false;
    if (dataView.getUint16(tiffOffset) == 0x4949) {
        bigEnd = false;
    }
    else if (dataView.getUint16(tiffOffset) == 0x4D4D) {
        bigEnd = true;
    }
    else {
        return false;
    }

    if (dataView.getUint16(tiffOffset + 2, !bigEnd) != 0x002A) {
        return false;
    }

    var firstIFDOffset = dataView.getUint32(tiffOffset + 4, !bigEnd);

    if (firstIFDOffset < 0x00000008) {
        return false;
    }

    var entryNumOffset = tiffOffset + firstIFDOffset;
    var entrieNum = dataView.getUint16(entryNumOffset, !bigEnd);//获取entry数量

    var entryOffset;

    for (var i = 0; i < entrieNum; i++) {
        entryOffset = entryNumOffset + 2 + i * 12;
        var sign = dataView.getUint16(entryOffset, !bigEnd);
        if (sign == 0x0112) {
            var type = dataView.getUint16(entryOffset + 2, !bigEnd);
            var numValues = dataView.getUint32(entryOffset + 4, !bigEnd);
            var valueOffset = dataView.getUint32(entryOffset + 8, !bigEnd) + tiffOffset;
            if (type === 3 && numValues === 1) {
                return dataView.getUint16(entryOffset + 8, !bigEnd);
            }
        }
    }
    return false;
}

function getFromFileBuffer(fileBuffer) {
    var dataView = new DataView(fileBuffer);

    if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
        return false; // not a valid jpeg
    }

    var offset = 2;
    var length = fileBuffer.byteLength;
    var marker;

    while (offset < length) {
        if (dataView.getUint8(offset) != 0xFF) {
            return false; // not a valid marker, something is wrong
        }

        marker = dataView.getUint8(offset + 1); // 偶数

        // we could implement handling for other markers here,
        // but we're only looking for 0xFFE1 for EXIF data
        if (marker == 225) { // App1开始标志，方向在该信息里
            return readOrientation(dataView, offset + 4);
            // offset += 2 + file.getShortAt(offset+2, true);
        }
        else {
            offset += 2 + dataView.getUint16(offset+2);
        }
    }
    return false;
}

function getOrientation(file, callback) {
    var fileReader = new FileReader();
    fileReader.onload = function(e) {
        var Orientation = getFromFileBuffer(e.target.result);
        callback(Orientation);
    };
    fileReader.readAsArrayBuffer(file);
}

/**
 * @file 处理任务
 * @author kaivean(kaisey2012@163.com)
 */

function loadFileToImg(file, callback) {
    var URL = window.URL || window.webkitURL;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
        callback(img);
    };
    img.src = url;
}

function handleCanvas(img, orientation, callback) {
    ployFillTobBlob();

    var width = img.naturalWidth || img.width;
    var height = img.naturalHeight || img.height;
    if (orientation && ('5678'.indexOf(orientation) > -1)) {
        width = img.naturalHeight || img.height;
        height = img.naturalWidth || img.width;
    }

    // 如果图片大于1百万像素，计算压缩比并将大小压至100万以下
    var ratio = width * height / 1000000;
    if (ratio > 1) {
        ratio = Math.sqrt(ratio);
        width /= ratio;
        height /= ratio;
    }
    else {
        ratio = 1;
    }

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    switch (orientation) {
        case 3:
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 6:
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 8:
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
            break;
        case 2:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, width, height);
            break;
        case 4:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width, -height, width, height);
            break;
        case 5:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -width, height, width);
            break;
        case 7:
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -height, 0, height, width);
            break;

        default:
            ctx.drawImage(img, 0, 0, width, height);
    }
    ctx.restore();

    // 进行压缩, 压缩率 0.75
    canvas.toBlob(function (newFile) {
        callback(newFile, width, height);
    }, 'image/jpeg', 0.75);
}

function compressImage(ofile, ocallback) {
    var file = ofile || {};
    var callback = ocallback || function () {};

    var fileType = file.type || '';
    if (file.type !== 'image/jpeg') {
        return callback(ofile);
    }

    loadFileToImg(file, function (img) {
        if (img) {
            // 修复ios下压缩后图片显示不对
            getOrientation(file, function (orientation) {
                orientation = orientation || 1;
                if (orientation) {
                    handleCanvas(img, orientation, function (newFile, width, height) {
                        // 新图比旧图还大，就用旧图
                        var becomeLarge = file.size <= newFile.size;
                        var returnFile = newFile;
                        if (becomeLarge) {
                            returnFile = file;
                        }
                        callback(returnFile);
                    });
                }
                else {
                    callback(ofile);
                }
            });
        }
        else {
            callback(ofile);
        }
    });
}

return compressImage;

})));


/**
 * @file 所有页面的公用逻辑
 * @author wukaifang(wukaifang@baidu.com)
 */

define(function (require, exports) {
    var compressOrientDataurl = require('./compress-orient-dataurl');
    var compressOrientBlob = require('./compress-orient-blob');
    var compressExifDataurl = require('./compress-exif-dataurl');
    var compressExifBlob = require('./compress-exif-blob');
    var compressNo = require('./compress-no');

    window.stat = {
        phone: 'iphone6--UC',
        fileTo: 0,
        toImg: 0,
        orient: 0,
        toCanvas: 0,
        rotate: 0,
        canvasOut: 0,
        upload: 0,
        total: 0
    }

    var compress ; // = compressOrientBlob;



    if (location.search.indexOf('compressOrientDataurl') > -1) {
        stat.type = 'compressOrientDataurl';
        compress = compressOrientDataurl;
    }
    if (location.search.indexOf('compressOrientBlob') > -1) {
        stat.type = 'compressOrientBlob';
        compress = compressOrientBlob;
    }
    if (location.search.indexOf('compressExifDataurl') > -1) {
        stat.type = 'compressExifDataurl';
        compress = compressExifDataurl;
    }
    if (location.search.indexOf('compressExifBlob') > -1) {
        stat.type = 'compressExifBlob';
        compress = compressExifBlob;
    }
    if (location.search.indexOf('compressNo') > -1) {
        stat.type = 'compressNo';
        compress = compressNo;
    }


    // 模块入口
    exports = function (file, callback) {
        ployFillTobBlob();
        stat.name = file.name;
        stat.total = performance.now();
        compress(file, function (base64OrFile, width, height) {
            stat.upload = performance.now();

            console.log('base64OrFile', base64OrFile);

            var formData = new FormData();
            formData.append('tn', 'wise');
            formData.append('image', base64OrFile);

            var params = {
                url: 'https://graph.baidu.com/upload',
                type: 'POST',
                timeout: 10000, // 5s
                data: formData,
                processData: false,
                contentType: false,
                cache: false,
                success: function (res) {
                    stat.upload = performance.now() - stat.upload;
                    stat.total = performance.now() - stat.total;

                    stat.url = '';
                    if (!res.status) {
                        stat.url = res.data.url;
                    }

                    callback(res);
                },
                error: function (xhr, errorType) {
                    stat.upload = performance.now() - stat.upload;
                    stat.total = performance.now() - stat.start;
                    callback({
                        status: 1,
                        info: 'ajaxerror,' + errorType
                    });
                }
            };

            $.ajax(params);
        });
    }


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

        ;(function (window) {
          'use strict'

          var CanvasPrototype = window.HTMLCanvasElement &&
                                  window.HTMLCanvasElement.prototype
          var hasBlobConstructor = window.Blob && (function () {
            try {
              return Boolean(new Blob())
            } catch (e) {
              return false
            }
          }())
          var hasArrayBufferViewSupport = hasBlobConstructor && window.Uint8Array &&
            (function () {
              try {
                return new Blob([new Uint8Array(100)]).size === 100
              } catch (e) {
                return false
              }
            }())
          var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
                              window.MozBlobBuilder || window.MSBlobBuilder
          var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/
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
                bb
              // Parse the dataURI components as per RFC 2397
              matches = dataURI.match(dataURIPattern)
              if (!matches) {
                throw new Error('invalid data URI')
              }
              // Default to text/plain;charset=US-ASCII
              mediaType = matches[2]
                ? matches[1]
                : 'text/plain' + (matches[3] || ';charset=US-ASCII')
              isBase64 = !!matches[4]
              dataString = dataURI.slice(matches[0].length)
              if (isBase64) {
                // Convert base64 to raw binary data held in a string:
                byteString = atob(dataString)
              } else {
                // Convert base64/URLEncoded data component to raw binary:
                byteString = decodeURIComponent(dataString)
              }
              // Write the bytes of the string to an ArrayBuffer:
              arrayBuffer = new ArrayBuffer(byteString.length)
              intArray = new Uint8Array(arrayBuffer)
              for (i = 0; i < byteString.length; i += 1) {
                intArray[i] = byteString.charCodeAt(i)
              }
              // Write the ArrayBuffer (or ArrayBufferView) to a blob:
              if (hasBlobConstructor) {
                return new Blob(
                  [hasArrayBufferViewSupport ? intArray : arrayBuffer],
                  {type: mediaType}
                )
              }
              bb = new BlobBuilder()
              bb.append(arrayBuffer)
              return bb.getBlob(mediaType)
            }
          if (window.HTMLCanvasElement && !CanvasPrototype.toBlob) {
            if (CanvasPrototype.mozGetAsFile) {
              CanvasPrototype.toBlob = function (callback, type, quality) {
                if (quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
                  callback(dataURLtoBlob(this.toDataURL(type, quality)))
                } else {
                  callback(this.mozGetAsFile('blob', type))
                }
              }
            } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
              CanvasPrototype.toBlob = function (callback, type, quality) {
                callback(dataURLtoBlob(this.toDataURL(type, quality)))
              }
            }
          }
          if (typeof define === 'function' && define.amd) {
            define(function () {
              return dataURLtoBlob
            })
          } else if (typeof module === 'object' && module.exports) {
            module.exports = dataURLtoBlob
          } else {
            window.dataURLtoBlob = dataURLtoBlob
          }
        }(window))
    }

    return exports;
});

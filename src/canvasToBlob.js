/**
 * @file 兼容toBlob, 兼容方法参考自：https://github.com/bjornstar/blob-polyfill
 * @author kaivean(kaisey2012@163.com)
 */

// 代码规范说明： 仅采用rollup的import方便打包而已，可以方便生成iife模块兼容代码，没有使用es6语法，因此变量还是var
/* eslint-disable no-var */

/**
 * canvas.toBlob的降级处理
 *
 * @param {string} dataURI 图片的dataURI
 * @return {Blob|undefined} 成功为blob对象，失败undefined
 */
function dataURLtoBlob(dataURI) {
    // 判断支持Blob
    var hasBlobConstructor = false;
    if (window.Blob) {
        try {
            hasBlobConstructor = Boolean(new Blob());
        }
        catch (e) {

        }
    }

    // 判断支持Uint8Array
    var hasArrayBufferViewSupport = false;
    if (hasBlobConstructor && window.Uint8Array) {
        try {
            hasArrayBufferViewSupport = new Blob([new Uint8Array(100)]).size === 100;
        }
        catch (e) {

        }
    }

    // 判断支持 BlobBuilder
    var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder
        || window.MozBlobBuilder || window.MSBlobBuilder;

    var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;
    var convert = function (dataURI) {
        if ((hasBlobConstructor || BlobBuilder) && window.atob && window.ArrayBuffer && window.Uint8Array) {
            var matches = dataURI.match(dataURIPattern);
            if (!matches) {
                throw new Error('invalid data URI');
            }
            // 默认类型 ： text/plain;charset=US-ASCII
            var mediaType = matches[2] ? matches[1] : 'text/plain' + (matches[3] || ';charset=US-ASCII');
            var isBase64 = !!matches[4];
            var dataString = dataURI.slice(matches[0].length);
            var byteString;
            if (isBase64) {
                // 把base64 转换成二进制
                byteString = atob(dataString);
            }
            else {
                // 把 base64/URLEncoded数据组件 转换成二进制
                byteString = decodeURIComponent(dataString);
            }

            // 把字符串转成 ArrayBuffer对象
            var arrayBuffer = new ArrayBuffer(byteString.length);
            var intArray = new Uint8Array(arrayBuffer);
            for (var i = 0; i < byteString.length; i += 1) {
                intArray[i] = byteString.charCodeAt(i);
            }
            // 把ArrayBuffer 或 ArrayBufferView转成blob对象
            if (hasBlobConstructor) {
                return new Blob(
                    [hasArrayBufferViewSupport ? intArray : arrayBuffer], {
                        type: mediaType
                    }
                );
            }
            var bb = new BlobBuilder();
            bb.append(arrayBuffer);
            return bb.getBlob(mediaType);
        }
        return;
    };

    /* eslint-disable no-func-assign */
    // 在这里做优化，只有真正第一次调用的时候，才执行初始化逻辑，然后覆盖原来函数，下次调用也不用初始化了
    dataURLtoBlob = convert;
    return convert(dataURI);
}

/**
 * 把canvas转换成blob，失败返回undefined
 *
 * @param {HTMLCanvasElement} canvas canvas
 * @param {Function} callback 回调
 * @param {string} type 图片类型
 * @param {float} quality 图片质量0-1
 */
export default function canvasToBlob(canvas, callback, type, quality) {
    // 本来就有toBlob，最好了
    if (canvas.toBlob) {
        canvas.toBlob(callback, type, quality);
        return;
    }

    var res;
    if (canvas.mozGetAsFile) {
        if (quality && canvas.toDataURL && dataURLtoBlob) {
            res = dataURLtoBlob(canvas.toDataURL(type, quality));
        }
        else {
            res = canvas.mozGetAsFile('blob', type);
        }
    }
    else if (canvas.toDataURL && dataURLtoBlob) {
        res = dataURLtoBlob(canvas.toDataURL(type, quality));
    }
    callback(res);
}

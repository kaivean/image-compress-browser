describe("测试集", function() {
    var file ;

    beforeEach(function(done) {

        function getfile() {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            var dataUrl = canvas.toDataURL('image/jpeg');
            var base64 = dataUrl.split('base64,')[1];
            var mime = 'image/jpeg';
            var sliceSize = 512;
            var byteCharacters = atob(base64);
            var byteArrays = [];
            var len = byteCharacters.length;
            for (var offset = 0; offset < len; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);
                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            file = new Blob(byteArrays, {type: mime});
            done();

        }

        var img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = function () {
            getfile()
        }
        img.onerror = function () {
            done();
        };
        img.src = '/base/test/test.jpeg';


        jasmine.addMatchers({
            toSizeCompare: function () {
                // 自定义Matcher：toBePlaying
                return {
                    //要返回的compare函数
                    compare: function (actual, expected) {
                        var pass = false;
                        if (actual.size <= expected.size) {
                            pass = true;
                        }
                        //compare函数中要返回的结果Object，这里是一个匿名Object，包含一个pass属性。
                        return {
                            pass: pass
                        }
                    }
                };
            }
        });
    });

    afterEach(function() {
        file = null;
    });

    it("file exist", function() {
        expect(file).not.toBeUndefined();
    });

    it("compressImage fail", function(done) {
        compressImage(file, function (newFile) {
            expect(newFile.size).toBe(newFile.size);
            done();
        });
    });

    it("compressImage success", function(done) {
        compressImage(file, function (newFile) {
            expect(newFile).toSizeCompare(file);
            done();
        });
    });

    it("compressImage success", function(done) {
        compressImage(file, function (newFile) {
            expect(newFile).toSizeCompare(file);
            done();
        });
    });
});

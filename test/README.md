karma and jasmine
==========

compress image on browser


## install
```
npm install karma --save-dev
npm install karma-jasmine karma-chrome-launcher jasmine-core --save-dev
```

## start
npm run test

### 参数callback
execute the callback after compressing image.

callback(newFile)

####参数newFile
`File`, the file compressed

## Example

```
var compressImage = require('image-compress-browser');
compressImage(file, function (newFile) {
    console.log('file:', file.size, 'newFile', newFile.size);
});
```

## ChangeLog
#### 2017.4.12
release v1

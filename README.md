compressImage
==========

compress image on browser


## Api
compressImage(file, callback)

### 参数file
`File`, file comes generally from `<input type="file" />`

### 参数callback
execute the callback after compressing image.

callback(newFile)

#### 参数newFile
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

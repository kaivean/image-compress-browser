compressImage
==========

compress image on browser


## Api
compressImage(file, callback)

### param: file
`File`, file comes generally from `<input type="file" />`

### param: callback
execute the callback after compressing image.
callback(newFile)

##### param: newFile
`File`, the file compressed

## Example

### Using require

```
var compressImage = require('image-compress-browser');
compressImage(file, function (newFile) {
    console.log('file:', file.size, 'newFile', newFile.size);
});
```

### Using compressed file
```
<script src="./node_modules/image-compress-browser/dist/compressImage.js"></script>
<script>
compressImage(file, function (newFile) {
    console.log('file:', file.size, 'newFile', newFile.size);
});
</script>
```

## ChangeLog
#### 2017.4.12
release v1

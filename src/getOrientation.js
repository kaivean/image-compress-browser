/**
 * @file 获取方位
 * @author kaivean(kaisey2012@163.com)
 */

 /**
  * 把二进制数据转为字符串
  *
  * @param {Buffer} buffer 文件二进制
  * @param {number} start 读取二进制的开始位
  * @param {number} length  读取二进制的长度
  * @return {string} 二进制转为字符串
  */
function getStringFromDB(buffer, start, length) {
    var outstr = '';
    for (var n = start; n < start + length; n++) {
        outstr += String.fromCharCode(buffer.getUint8(n));
    }
    return outstr;
}

/**
 * 分析App1域，获取到方位值，此时找到app1域，方位值一般都存放这里
 *
 * @param {DataView} dataView 文件的DataView对象
 * @param {number} e1Offset app1域偏移值
 * @return {boolean|number} 如果获取方位值失败，返回false，否则返回方位值
 */
function readOrientation(dataView, e1Offset) {
    if (getStringFromDB(dataView, e1Offset, 4) !== 'Exif') {
        return false;
    }
    var tiffOffset = e1Offset + 6;
    var bigEnd = false;

    // 图片方位值存储可能有大端和小端，因此先确定大小端，然后才能确定从左到右还是反过来读取出后续的数值
    if (dataView.getUint16(tiffOffset) === 0x4949) {
        bigEnd = false;
    }
    else if (dataView.getUint16(tiffOffset) === 0x4D4D) {
        bigEnd = true;
    }
    else {
        return false;
    }

    // 002A 为约定的常量数值
    if (dataView.getUint16(tiffOffset + 2, !bigEnd) !== 0x002A) {
        return false;
    }

    //  接下来的4B为TIFF数据相对TIFF开始位置的offset
    var firstIFDOffset = dataView.getUint32(tiffOffset + 4, !bigEnd);

    // 头部为8个字节所以这个值一般为8, 不为8就错误
    if (firstIFDOffset < 0x00000008) {
        return false;
    }

    var entryNumOffset = tiffOffset + firstIFDOffset;

    // IFD的目录的每个记录指向一个IFD entry， 会有多个entry，每个entry存放不同的数据，如方位，宽，高等
    var entrieNum = dataView.getUint16(entryNumOffset, !bigEnd); // 获取entry数量

    var entryOffset;

    // 选好遍历每个entry
    for (var i = 0; i < entrieNum; i++) {
        // 每个IFD Entry（索引）有12个字节组成, 前2为是tag，第三位开始就是数据类型
        entryOffset = entryNumOffset + i * 12 + 2;
        // sign表示tag，
        var sign = dataView.getUint16(entryOffset, !bigEnd);
        // 方位值的tag由两个字节表示 0x0112
        if (sign === 0x0112) {
            // 数据类型有：1是BYTE，2是ASCII，3是SHORT等
            var type = dataView.getUint16(entryOffset + 2, !bigEnd);
            // 这里是数量
            var numValues = dataView.getUint32(entryOffset + 4, !bigEnd);
            if (type === 3 && numValues === 1) {
                // 第8位开始后两个字节就是数值
                return dataView.getUint16(entryOffset + 8, !bigEnd);
            }
        }
    }
    return false;
}

/**
 * 分析图片字节，找到方位中值
 *
 * @param {Buffer} fileBuffer 文件的二进制对象
 * @return {boolean|number} 如果获取方位值失败，返回false，否则返回方位值
 */
function getFromFileBuffer(fileBuffer) {
    // 建立dataview对象，方便后续好处理字节
    var dataView = new DataView(fileBuffer);

    // 0xFF 0xD8 代表jpeg图片，否则不是jpg图片
    if ((dataView.getUint8(0) !== 0xFF) || (dataView.getUint8(1) !== 0xD8)) {
        return false;
    }

    var offset = 2;
    var length = fileBuffer.byteLength;
    var marker;

    // 开始去扫描图片二进制 字节，去分析得出方位值
    while (offset < length) {
        // 不是有效的标记， 图片格式有问题
        if (dataView.getUint8(offset) !== 0xFF) {
            return false;
        }

        // 拿到offset的第二个字节,是App1域的开始标志
        marker = dataView.getUint8(offset + 1); // 偶数

        // 在此处只处理EXIF数据的 0xFFE1
        if (marker === 225) { // App1开始标志，方向在该信息里
            return readOrientation(dataView, offset + 4);
        }
        // 获取16位的数值，找到下一个图片的域的偏移位
        offset += 2 + dataView.getUint16(offset + 2);
    }
    return false;
}

/**
 * 获取图片里的拍照时的方位，因为ios下，压缩后，拍照方位信息丢失，
 * 再到页面显示时，显示的图片就会被旋转，在这里获取方位后压缩前做处理
 *
 * @param {File|Blob} file 文件对象
 * @param {Function} callback 获取成功的返回
 */
export default function getOrientation(file, callback) {
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        var Orientation = getFromFileBuffer(e.target.result);
        callback(Orientation);
    };
    fileReader.readAsArrayBuffer(file);
}

/**
 * @file 工具函数
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

    console.log('entryNum', entrieNum);
    for (var i = 0; i < entrieNum; i++) {
        entryOffset = entryNumOffset + 2 + i * 12;
        console.log('entry' + i, dataView.getUint8(entryOffset, !bigEnd).toString(16).toUpperCase(),dataView.getUint8(entryOffset+1, !bigEnd).toString(16).toUpperCase());

        var sign = dataView.getUint16(entryOffset, !bigEnd);
        if (sign == 0x0112) {
            var type = dataView.getUint16(entryOffset + 2, !bigEnd);
            var numValues = dataView.getUint32(entryOffset + 4, !bigEnd);
            var valueOffset = dataView.getUint32(entryOffset + 8, !bigEnd) + tiffOffset;
            if (type === 3 && numValues === 1) {
                console.log('Orientation', dataView.getUint16(entryOffset + 8, !bigEnd));
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
        if (statData.type.indexOf('Orient') > -1) {
            statData.orient = performance.now();
            var Orientation = getFromFileBuffer(e.target.result);
            statData.orient = performance.now() - statData.orient;

            $('#other').html('get Orientation by 自己计算： ' + Orientation);
            callback(Orientation);
        }
        else {
            statData.orient = performance.now();
            var data = exif.readFromBinaryFile(e.target.result);
            statData.orient = performance.now() - statData.orient;

            $('#other').html('get Orientation by exif ' + data['Orientation']);
            callback(data['Orientation']);
        }
    };

    fileReader.readAsArrayBuffer(file);
}

export default getOrientation;

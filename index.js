const Client = require('ftp');
const fs = require('fs');
const https = require('https');
const exec = require('child_process').exec;

function downloadFileHTTP(filePath, outPath, onFinish, onProgress) {
    if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
    }

    let downloaded = 0;
    const file = fs.createWriteStream(outPath);

    https.get(filePath, (res) => {
        if (parseInt(res.statusCode) !== 200) {
            fs.unlinkSync(outPath);
            throw new Error("Error code", res.statusCode);
        } 

        const size = parseInt(res.headers["content-length"]);
        
        res.pipe(file);
        
        res.on('data', (d) => {
            downloaded += d.length;
            if (onProgress)
                onProgress({
                    downloaded: downloaded,
                    size: size
                })
        });

        file.on('finish', (e) => {
            file.close(() => {
                if (onFinish)
                    onFinish(outPath);
            });
        });

        res.on('error', (e) => {
            console.error(e);
            fs.unlinkSync(outPath);
        });
    });
}

function downloadFileFTP(url, filePath, outPath, onFinish, onProgress) {
    if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
    }

    var c = new Client();
    c.on('ready', function() {
        c.list(filePath, function(err, list) {
            if (err) throw err;
            const size = list[0].size;
            let downloadedSize = 0;
            c.get(filePath, function(err, stream) {
                if (err) throw err;

                stream.on('close', function() { 
                    if (onFinish) 
                        onFinish();
                    c.end(); 
                });

                stream.on('data', function(buffer) {
                    downloadedSize += buffer.length;
                    if (onProgress)
                        onProgress({
                            downloaded: downloadedSize,
                            size: size
                        })
                });

                stream.pipe(fs.createWriteStream(outPath));
              });
        });
        
    });
    // connect to localhost:21 as anonymous
    c.connect({
        host: url
    });
}


function download(tool, {onFinish, onProgress}) {
    const operatingSystem = process.platform;
    const arch = process.arch;
    const file = tool.files[operatingSystem][arch];
    if (tool.type === "ftp") {
        downloadFileFTP(tool.host, file, tool.out, onFinish, onProgress);
    } else {
        downloadFileHTTP(file, tool.out, onFinish, onProgress);
    }
    
}

function install(path, onFinish) {
    var result = '';
    
    var child = exec(path);
    
    child.stdout.on('data', function(data) {
        result += data;
    });
    
    child.on('close', function() {
        if (onFinish)
            onFinish(result);
    });
}

module.exports = {
    download,
    install
};
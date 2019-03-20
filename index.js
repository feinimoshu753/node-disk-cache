var path = require('path');
var fs = require('fs');

var _defaultOptions = {
  path: '/cache', // 缓存目录
  expires: 7, // 单位day
  max: 1024, // 单位M
  prefix: 'disk_cache' // 缓存前缀名
};

function DiskCache(options) {
  if (!(this instanceof DiskCache)) {
    return new DiskCache(options)
  }

  this.expires = options.expires || '';
  this.path = options.path || '/cache';
  this.max = options.max || 1024;
  this._resolvePath = '';
  this._writing = false;
  this._totalSize = 0;
  this._writeQueue = [];

  _init(this);
}

DiskCache.prototype.set = function (key, value, callback) {

};

DiskCache.prototype.setSync = function (key, value) {

};

DiskCache.prototype.get = function () {

};

DiskCache.prototype.getSync = function () {

};

DiskCache.prototype.remove = function () {

};

DiskCache.prototype.removeSync = function () {

};

DiskCache.prototype.removeAll = function () {

};

DiskCache.prototype.removeAllSync = function () {

};

function _init(instance) {
  // 获取绝对路径
  instance._resolvePath = path.resolve(instance.path);
  // path所在的目录不存在，则创建该目录
  fs.access(instance._resolvePath, fs.constants.F_OK, (err) => {
    if (err) {
      // 创建缓存目录
      fs.mkdir(instance._resolvePath, {recursive: true}, (mkdirErr) => {
        if (mkdirErr) {
          throw mkdirErr;
        }
      });
    }
  });
  // 获取缓存大小
  _calculateFilesSize(instance);
}

function _calculateFilesSize(instance) {
  fs.readdir(instance._resolvePath, (err, data) => {
    if (err || !Array.isArray(data)) {
      return;
    }
    data.forEach((value) => {
      try {
        const stats = fs.statSync(`${path}/${value}`);
        if (stats.isDirectory()) {
          _calculateFilesSize(`${path}/${value}`);
        } else {
          instance._totalSize += stats.size;
        }
      } catch (e) {
        console.log('文件不存在');
      }
    });
  });
}

/**
 * 清除离访问时间最久的文件
 */
function _clearExpireFile (instance) {
  // 放入异步任务中
  setTimeout(() => {
    const caches = _getAllCaches();
    caches.forEach((value) => {
      // 文件过期，删除该文件
      if (Date.now() - value.createTime > instance.expires * 24 * 3600 * 1000) {
       fs.unlink(value.path);
      }
    });
    if (instance.maxSize !== Infinity) {
      const maxSizeByte = instance.maxSize * 1024 * 1024;
      // 最大剩余空间为5%
      const REST_MAX_SIZE = maxSizeByte / 20;
      // 只剩下5%的空间时，删除部分缓存
      if ((maxSizeByte - instance._totalSize) < REST_MAX_SIZE) {
        _clearCache();
      }
    }
  }, 0);
}

/**
 * 清除访问时间的缓存
 */
function _clearCache (instance) {
  // 放入异步任务中
  setTimeout(() => {
    const caches = _sortByAccessTime(_getAllCaches());
    const REMOVE_CACHE_NUMBER = 10;
    caches.forEach((value, index) => {
      // 删除前十个最近未使用的缓存
      if (index < REMOVE_CACHE_NUMBER) {
        fs.unlink(value.path, (err) => {
          if (err) {
            return;
          }
          instance._totalSize -= value.size;
        });
      }
    });
  });
}

/**
 * 遍历所有缓存
 */
function _getAllCaches (instance) {
  const caches = [];

  function traverse(path) {
    let data = null;
    try {
      data = fs.readdirSync(path);
    } catch (e) {
      console.log('文件不存在');
    }
    if (!data || data.length === 0) {
      return;
    }
    data.forEach((value) => {
      let stats = null;
      try {
        stats = fs.statSync(`${path}/${value}`);
      } catch (e) {
        console.log('文件不存在');
      }
      if (!stats) {
        return;
      }
      if (stats.isDirectory()) {
        traverse(`${path}/${value}`);
      } else {
        // 缓存存储文件路径，最后访问时间，创建时间,文件大小
        caches.push({
          path: `${path}/${value}`,
          accessTime: stats.atimeMs,
          createTime: stats.ctimeMs,
          size: stats.size,
        });
      }
    });
  }
  traverse(instance._resolvePath);
  return caches;
}

/**
 * 按访问时间排序
 * @param caches
 */
function _sortByAccessTime (caches) {
  if (!Array.isArray(caches)) {
    return [];
  }
  return caches.sort((pre, next) => pre.accessTime - next.accessTime);
}

/**
 * 校验缓存目录是否存在，不存在则创建一个
 */
function _checkCacheMkdir (instance) {
  let exist = null;
  try {
    exist = fs.accessSync(instance._resolvePath, constants.F_OK);
  } catch (e) {
    console.log('获取路径失败');
  }
  if (!exist) {
    try {
      fs.mkdirSync(instance._resolvePath, { recursive: true });
    } catch (e) {
      console.log('创建目录失败');
    }
  }
}

module.exports = DiskCache;
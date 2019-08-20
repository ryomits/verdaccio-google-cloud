"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.defaultValidation = exports.pkgFileName = void 0;

var _streams = require("@verdaccio/streams");

var _commonsApi = require("@verdaccio/commons-api");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const pkgFileName = 'package.json';
exports.pkgFileName = pkgFileName;
const defaultValidation = 'crc32c';
exports.defaultValidation = defaultValidation;

const packageAlreadyExist = function (name) {
  return (0, _commonsApi.getConflict)(`${name} package already exist`);
};

class GoogleCloudStorageHandler {
  constructor(name, helper, config, logger) {
    _defineProperty(this, "config", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "key", void 0);

    _defineProperty(this, "helper", void 0);

    _defineProperty(this, "name", void 0);

    this.name = name;
    this.logger = logger;
    this.helper = helper;
    this.config = config;
    this.key = 'VerdaccioMetadataStore';
  }

  updatePackage(name, updateHandler, onWrite, transformPackage, onEnd) {
    this._readPackage(name).then(metadata => {
      updateHandler(metadata, err => {
        if (err) {
          this.logger.error({
            name: name,
            err: err.message
          }, 'gcloud: on write update @{name} package has failed err: @{err}');
          return onEnd(err);
        }

        try {
          onWrite(name, transformPackage(metadata), onEnd);
        } catch (err) {
          this.logger.error({
            name: name,
            err: err.message
          }, 'gcloud: on write update @{name} package has failed err: @{err}');
          return onEnd((0, _commonsApi.getInternalError)(err.message));
        }
      });
    }, err => {
      this.logger.error({
        name: name,
        err: err.message
      }, 'gcloud: update @{name} package has failed err: @{err}');
      onEnd((0, _commonsApi.getInternalError)(err.message));
    }).catch(err => {
      this.logger.error({
        name,
        error: err
      }, 'gcloud: trying to update @{name} and was not found on storage err: @{error}');
      return onEnd((0, _commonsApi.getNotFound)());
    });
  }

  deletePackage(fileName, cb) {
    const file = this.helper.buildFilePath(this.name, fileName);
    this.logger.debug({
      name: file.name
    }, 'gcloud: deleting @{name} from storage');

    try {
      file.delete().then(data => {
        const apiResponse = data[0];
        this.logger.debug({
          name: file.name
        }, 'gcloud: @{name} was deleted successfully from storage');
        cb(null, apiResponse);
      }).catch(err => {
        this.logger.error({
          name: file.name,
          err: err.message
        }, 'gcloud: delete @{name} file has failed err: @{err}');
        cb((0, _commonsApi.getInternalError)(err.message));
      });
    } catch (err) {
      this.logger.error({
        name: file.name,
        err: err.message
      }, 'gcloud: delete @{name} file has failed err: @{err}');
      cb((0, _commonsApi.getInternalError)('something went wrong'));
    }
  }

  removePackage(callback) {
    // remove all files from storage
    const file = this.helper.getBucket().file(`${this.name}`);
    this.logger.debug({
      name: file.name
    }, 'gcloud: removing the package @{name} from storage');
    file.delete().then(() => {
      this.logger.debug({
        name: file.name
      }, 'gcloud: package @{name} was deleted successfully from storage');
      callback(null);
    }, err => {
      this.logger.error({
        name: file.name,
        err: err.message
      }, 'gcloud: delete @{name} package has failed err: @{err}');
      callback((0, _commonsApi.getInternalError)(err.message));
    });
  }

  createPackage(name, metadata, cb) {
    this.logger.debug({
      name
    }, 'gcloud: creating new package for @{name}');

    this._fileExist(name, pkgFileName).then(exist => {
      if (exist) {
        this.logger.debug({
          name
        }, 'gcloud: creating @{name} has failed, it already exist');
        cb(packageAlreadyExist(name));
      } else {
        this.logger.debug({
          name
        }, 'gcloud: creating @{name} on storage');
        this.savePackage(name, metadata, cb);
      }
    }, err => {
      this.logger.error({
        name: name,
        err: err.message
      }, 'gcloud: create package @{name} has failed err: @{err}');
      cb((0, _commonsApi.getInternalError)(err.message));
    });
  }

  savePackage(name, value, cb) {
    this.logger.debug({
      name
    }, 'gcloud: saving package for @{name}');

    this._savePackage(name, value).then(() => {
      this.logger.debug({
        name
      }, 'gcloud: @{name} has been saved successfully on storage');
      cb(null);
    }).catch(err => {
      this.logger.error({
        name: name,
        err: err.message
      }, 'gcloud: save package @{name} has failed err: @{err}');
      return cb(err);
    });
  }

  _savePackage(name, metadata) {
    return new Promise(async (resolve, reject) => {
      const file = this.helper.buildFilePath(name, pkgFileName);

      try {
        await file.save(this._convertToString(metadata), {
          validation: this.config.validation || defaultValidation,

          /**
           * When resumable is `undefined` - it will default to `true`as per GC Storage documentation:
           * `Resumable uploads are automatically enabled and must be shut off explicitly by setting options.resumable to false`
           * @see https://cloud.google.com/nodejs/docs/reference/storage/2.5.x/File#createWriteStream
           */
          resumable: this.config.resumable
        });
        resolve(null);
      } catch (err) {
        reject((0, _commonsApi.getInternalError)(err.message));
      }
    });
  }

  _convertToString(value) {
    return JSON.stringify(value, null, '\t');
  }

  readPackage(name, cb) {
    this.logger.debug({
      name
    }, 'gcloud: reading package for @{name}');

    this._readPackage(name).then(json => {
      this.logger.debug({
        name
      }, 'gcloud: package @{name} was fetched from storage');
      cb(null, json);
    }).catch(err => {
      this.logger.debug({
        name: name,
        err: err.message
      }, 'gcloud: read package @{name} has failed err: @{err}');
      cb(err);
    });
  }

  _fileExist(name, fileName) {
    return new Promise(async (resolve, reject) => {
      const file = this.helper.buildFilePath(name, fileName);

      try {
        const data = await file.exists();
        const exist = data[0];
        resolve(exist);
        this.logger.debug({
          name: name,
          exist
        }, 'gcloud: check whether @{name} exist successfully: @{exist}');
      } catch (err) {
        this.logger.error({
          name: file.name,
          err: err.message
        }, 'gcloud: check exist package @{name} has failed, cause: @{err}');
        reject((0, _commonsApi.getInternalError)(err.message));
      }
    });
  }

  async _readPackage(name) {
    return new Promise(async (resolve, reject) => {
      const file = this.helper.buildFilePath(name, pkgFileName);

      try {
        const content = await file.download();
        this.logger.debug({
          name: this.name
        }, 'gcloud: @{name} was found on storage');
        const response = JSON.parse(content[0].toString('utf8'));
        resolve(response);
      } catch (err) {
        this.logger.debug({
          name: this.name
        }, 'gcloud: @{name} package not found on storage');
        reject((0, _commonsApi.getNotFound)());
      }
    });
  }

  writeTarball(name) {
    const uploadStream = new _streams.UploadTarball({});

    try {
      this._fileExist(this.name, name).then(exist => {
        if (exist) {
          this.logger.debug({
            url: this.name
          }, 'gcloud:  @{url} package already exist on storage');
          uploadStream.emit('error', packageAlreadyExist(name));
        } else {
          const file = this.helper.getBucket().file(`${this.name}/${name}`);
          this.logger.info({
            url: file.name
          }, 'gcloud: the @{url} is being uploaded to the storage');
          const fileStream = file.createWriteStream({
            validation: this.config.validation || defaultValidation
          });

          uploadStream.done = () => {
            uploadStream.on('end', () => {
              fileStream.on('response', () => {
                this.logger.debug({
                  url: file.name
                }, 'gcloud: @{url} has been successfully uploaded to the storage');
                uploadStream.emit('success');
              });
            });
          };

          fileStream._destroy = function (err) {
            // this is an error when user is not authenticated
            // [BadRequestError: Could not authenticate request
            //  getaddrinfo ENOTFOUND www.googleapis.com www.googleapis.com:443]
            if (err) {
              uploadStream.emit('error', (0, _commonsApi.getBadRequest)(err.message));
              fileStream.emit('close');
            }
          };

          fileStream.on('open', () => {
            this.logger.debug({
              url: file.name
            }, 'gcloud: upload streem has been opened for @{url}');
            uploadStream.emit('open');
          });
          fileStream.on('error', err => {
            this.logger.error({
              url: file.name
            }, 'gcloud: upload stream has failed for @{url}');
            fileStream.end();
            uploadStream.emit('error', (0, _commonsApi.getBadRequest)(err.message));
          });

          uploadStream.abort = () => {
            this.logger.warn({
              url: file.name
            }, 'gcloud: upload stream has been aborted for @{url}');
            fileStream.destroy(undefined);
          };

          uploadStream.pipe(fileStream);
          uploadStream.emit('open');
        }
      }, err => {
        uploadStream.emit('error', (0, _commonsApi.getInternalError)(err.message));
      });
    } catch (err) {
      uploadStream.emit('error', err);
    }

    return uploadStream;
  }

  readTarball(name) {
    const localReadStream = new _streams.ReadTarball({});
    const file = this.helper.getBucket().file(`${this.name}/${name}`);
    const bucketStream = file.createReadStream();
    this.logger.debug({
      url: file.name
    }, 'gcloud: reading tarball from @{url}');

    localReadStream.abort = function abortReadTarballCallback() {
      bucketStream.destroy(undefined);
    };

    bucketStream.on('error', err => {
      if (err.code === _commonsApi.HTTP_STATUS.NOT_FOUND) {
        this.logger.debug({
          url: file.name
        }, 'gcloud: tarball @{url} do not found on storage');
        localReadStream.emit('error', (0, _commonsApi.getNotFound)());
      } else {
        this.logger.error({
          url: file.name
        }, 'gcloud: tarball @{url} has failed to be retrieved from storage');
        localReadStream.emit('error', (0, _commonsApi.getBadRequest)(err.message));
      }
    }).on('response', response => {
      const size = response.headers['content-length'];
      const {
        statusCode
      } = response;

      if (statusCode !== _commonsApi.HTTP_STATUS.NOT_FOUND) {
        if (size) {
          localReadStream.emit('open');
        }

        if (parseInt(size, 10) === 0) {
          this.logger.error({
            url: file.name
          }, 'gcloud: tarball @{url} was fetched from storage and it is empty');
          localReadStream.emit('error', (0, _commonsApi.getInternalError)('file content empty'));
        } else if (parseInt(size, 10) > 0 && statusCode === _commonsApi.HTTP_STATUS.OK) {
          localReadStream.emit('content-length', response.headers['content-length']);
        }
      } else {
        this.logger.debug({
          url: file.name
        }, 'gcloud: tarball @{url} do not found on storage');
        localReadStream.emit('error', (0, _commonsApi.getNotFound)());
      }
    }).pipe(localReadStream);
    return localReadStream;
  }

}

var _default = GoogleCloudStorageHandler;
exports.default = _default;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ERROR_MISSING_CONFIG = void 0;

var _storage = require("@google-cloud/storage");

var _datastore = require("@google-cloud/datastore");

var _commonsApi = require("@verdaccio/commons-api");

var _storage2 = _interopRequireDefault(require("./storage"));

var _storageHelper = _interopRequireDefault(require("./storage-helper"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const ERROR_MISSING_CONFIG = 'google cloud storage missing config. Add `store.google-cloud` to your config file';
exports.ERROR_MISSING_CONFIG = ERROR_MISSING_CONFIG;

class GoogleCloudDatabase {
  constructor(config, options) {
    _defineProperty(this, "helper", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "config", void 0);

    _defineProperty(this, "kind", void 0);

    _defineProperty(this, "bucketName", void 0);

    _defineProperty(this, "keyFilename", void 0);

    _defineProperty(this, "GOOGLE_OPTIONS", void 0);

    if (!config) {
      throw new Error(ERROR_MISSING_CONFIG);
    }

    this.config = config;
    this.logger = options.logger;
    this.kind = config.kind || 'VerdaccioDataStore'; // if (!this.keyFilename) {
    //   throw new Error('Google Storage requires a a key file');
    // }

    if (!config.bucket) {
      throw new Error('Google Cloud Storage requires a bucket name, please define one.');
    }

    this.bucketName = config.bucket;

    const {
      datastore,
      storage
    } = this._createEmptyDatabase();

    this.helper = new _storageHelper.default(datastore, storage, this.config);
  }

  _getGoogleOptions(config) {
    const GOOGLE_OPTIONS = {};

    if (!config.projectId || typeof config.projectId !== 'string') {
      throw new Error('Google Cloud Storage requires a ProjectId.');
    }

    GOOGLE_OPTIONS.projectId = config.projectId || process.env.GOOGLE_CLOUD_VERDACCIO_PROJECT_ID;
    const keyFileName = config.keyFilename || process.env.GOOGLE_CLOUD_VERDACCIO_KEY;

    if (keyFileName) {
      GOOGLE_OPTIONS.keyFilename = keyFileName;
      this.logger.warn('Using credentials in a file might be un-secure and is only recommended for local development');
    }

    this.logger.warn({
      content: JSON.stringify(GOOGLE_OPTIONS)
    }, 'Google storage settings: @{content}');
    return GOOGLE_OPTIONS;
  }

  search(onPackage, onEnd) {
    this.logger.warn('search method has not been implemented yet');
    onEnd();
  }

  saveToken(token) {
    this.logger.warn({
      token
    }, 'save token has not been implemented yet @{token}');
    return Promise.reject((0, _commonsApi.getServiceUnavailable)('[saveToken] method not implemented'));
  }

  deleteToken(user, tokenKey) {
    this.logger.warn({
      tokenKey,
      user
    }, 'delete token has not been implemented yet @{user}');
    return Promise.reject((0, _commonsApi.getServiceUnavailable)('[deleteToken] method not implemented'));
  }

  readTokens(filter) {
    this.logger.warn({
      filter
    }, 'read tokens has not been implemented yet @{filter}');
    return Promise.reject((0, _commonsApi.getServiceUnavailable)('[readTokens] method not implemented'));
  }

  getSecret() {
    const key = this.helper.datastore.key(['Secret', 'secret']);
    this.logger.debug('gcloud: [datastore getSecret] init');
    return this.helper.datastore.get(key).then( // @ts-ignore
    data => {
      this.logger.trace({
        data
      }, 'gcloud: [datastore getSecret] response @{data}');
      const entities = data[0];

      if (!entities) {
        // @ts-ignore
        return null;
      } // "{\"secret\":\"181bc38698078f880564be1e4d7ec107ac8a3b344a924c6d86cea4a84a885ae0\"}"


      return entities.secret;
    });
  }

  setSecret(secret) {
    const key = this.helper.datastore.key(['Secret', 'secret']);
    const entity = {
      key,
      data: {
        secret
      }
    };
    this.logger.debug('gcloud: [datastore setSecret] added');
    return this.helper.datastore.upsert(entity);
  }

  add(name, cb) {
    const datastore = this.helper.datastore;
    const key = datastore.key([this.kind, name]);
    const data = {
      name: name
    };
    this.logger.debug('gcloud: [datastore add] @{name} init');
    datastore.save({
      key: key,
      data: data
    }).then(response => {
      const res = response[0];
      this.logger.debug('gcloud: [datastore add] @{name} has been added');
      this.logger.trace({
        res
      }, 'gcloud: [datastore add] @{name} response: @{res}');
      cb(null);
    }).catch(err => {
      const error = (0, _commonsApi.getInternalError)(err.message);
      this.logger.debug({
        error
      }, 'gcloud: [datastore add] @{name} error @{error}');
      cb((0, _commonsApi.getInternalError)(error.message));
    });
  }

  async _deleteItem(name, item) {
    try {
      const datastore = this.helper.datastore;
      const key = datastore.key([this.kind, datastore.int(item.id)]);
      await datastore.delete(key);
    } catch (err) {
      return (0, _commonsApi.getInternalError)(err.message);
    }
  }

  remove(name, cb) {
    this.logger.debug('gcloud: [datastore remove] @{name} init'); // const deletedItems: any = [];
    // const sanityCheck = (deletedItems: any): null | Error => {
    //   if (typeof deletedItems === 'undefined' || deletedItems.length === 0 || deletedItems[0][0].indexUpdates === 0) {
    //     return getNotFound('trying to remove a package that does not exist');
    //   } else if (deletedItems[0][0].indexUpdates > 0) {
    //     return null;
    //   } else {
    //     return getInternalError('this should not happen');
    //   }
    // };

    this.helper.getEntities(this.kind).then(async entities => {
      for (const item of entities) {
        if (item.name === name) {
          await this._deleteItem(name, item); // deletedItems.push(deletedItem);
        }
      }

      cb(null);
    }).catch(err => {
      cb((0, _commonsApi.getInternalError)(err.message));
    });
  }

  get(cb) {
    this.logger.debug('gcloud: [datastore get] init');
    const query = this.helper.datastore.createQuery(this.kind);
    this.logger.trace({
      query
    }, 'gcloud: [datastore get] query @{query}');
    this.helper.runQuery(query).then(data => {
      const response = data[0];
      this.logger.trace({
        response
      }, 'gcloud: [datastore get] query results @{response}');
      const names = response.reduce((accumulator, task) => {
        accumulator.push(task.name);
        return accumulator;
      }, []);
      this.logger.trace({
        names
      }, 'gcloud: [datastore get] names @{names}');
      cb(null, names);
    });
  }

  sync() {
    this.logger.warn('synk method has not been implemented yet @{user}');
  }

  getPackageStorage(packageInfo) {
    const {
      helper,
      config,
      logger
    } = this;
    return new _storage2.default(packageInfo, helper, config, logger);
  }

  _createEmptyDatabase() {
    const options = this._getGoogleOptions(this.config);

    const datastore = new _datastore.Datastore(options);
    const storage = new _storage.Storage(options);
    const list = [];
    const files = {};
    const emptyDatabase = {
      datastore,
      storage,
      list,
      // not used
      files,
      // not used
      secret: ''
    };
    return emptyDatabase;
  }

}

var _default = GoogleCloudDatabase;
exports.default = _default;
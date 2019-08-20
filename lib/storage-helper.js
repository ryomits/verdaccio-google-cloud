"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class StorageHelper {
  constructor(datastore, storage, config) {
    _defineProperty(this, "datastore", void 0);

    _defineProperty(this, "storage", void 0);

    _defineProperty(this, "config", void 0);

    this.datastore = datastore;
    this.config = config;
    this.storage = storage;
  }

  createQuery(key, valueQuery) {
    const query = this.datastore.createQuery(key).filter('name', valueQuery);
    return query;
  }

  buildFilePath(name, fileName) {
    return this.getBucket().file(`${name}/${fileName}`);
  }

  getBucket() {
    return this.storage.bucket(this.config.bucket);
  }

  async runQuery(query) {
    // https://cloud.google.com/datastore/docs/reference/data/rest/v1/projects/runQuery
    const result = await this.datastore.runQuery(query);
    return result;
  } // public async updateEntity(key: string, excludeFromIndexes: any, data: any): Promise<CommitResult> {
  //   const entity = {
  //     key,
  //     excludeFromIndexes,
  //     data
  //   };
  //   const result: CommitResult = await this.datastore.update(entity);
  //   return result;
  // }
  // FIXME: not sure whether we need this
  // public async getFile(bucketName: string, path: string): Promise<void> {
  // const myBucket = this.storage.bucket(bucketName);
  // const file = myBucket.file(path);
  // const data = await file.get();
  // const fileData = data[0];
  // const apiResponse = data[1];
  // // console.log('fileData', fileData);
  // // console.log('apiResponse', apiResponse);
  // }
  // public async deleteEntity(key: string, itemId: any): Promise<any> {
  //   const keyToDelete = this.datastore.key([key, this.datastore.int(itemId)]);
  //   const deleted = await this.datastore.delete(keyToDelete);
  //   return deleted;
  // }

  /**
   * Data objects in Cloud Firestore in Datastore mode are known as entities.
   * An entity has one or more named properties, each of which can have one or more values.
   * Entities of the same kind do not need to have the same properties,
   * and an entity's values for a given property do not all need to be of the same data type.
   * (If necessary, an application can establish and enforce such restrictions in its own data model.)
   * https://cloud.google.com/datastore/docs/concepts/entities
   * @param key
   */


  async getEntities(key) {
    const datastore = this.datastore;
    const query = datastore.createQuery(key);
    const dataQuery = await datastore.runQuery(query);
    const response = dataQuery[0];
    const data = response.reduce((accumulator, task) => {
      const taskKey = task[datastore.KEY];

      if (task.name) {
        accumulator.push({
          id: taskKey.id,
          name: task.name
        });
      }

      return accumulator;
    }, []);
    return data;
  }

}

exports.default = StorageHelper;
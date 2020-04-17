import GitMaster from '../core/GitMaster';
import optionsStorage from '../../../Background/options-storage';

class Storage {
  level: {
    [propName: string]: string
  };

  ctx: GitMaster;

  constructor(ctx: GitMaster) {
    this.level = {
    };
    this.ctx = ctx;
  }


  async getAll(): Promise<any> {
    const result = await optionsStorage.getAll();

    return result;
  }

  async setAll(newOptions: any): Promise<void> {
    const result = await optionsStorage.setAll(newOptions);

    return result;
  }

  async set(newOptions: any): Promise<void> {
    const result = await optionsStorage.set(newOptions);

    return result;
  }
}

export default Storage;

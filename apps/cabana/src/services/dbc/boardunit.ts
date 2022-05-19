export default class BoardUnit {
  name: string;

  attributes: object;

  comment: string | null;

  constructor(name: string) {
    this.name = name;
    this.attributes = {};
    this.comment = null;
  }

  text() {
    return this.name;
  }
}

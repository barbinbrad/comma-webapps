import DBC from '../dbc';

const storage = {
  fetchPersistedDBC(route: string) {
    const maybeDbc = window.localStorage.getItem(route);
    if (maybeDbc !== null) {
      const { dbcFilename, dbcText } = JSON.parse(maybeDbc);
      const dbc = new DBC(dbcText);

      return { dbc, dbcText, dbcFilename };
    }
    return null;
  },
};

export default storage;

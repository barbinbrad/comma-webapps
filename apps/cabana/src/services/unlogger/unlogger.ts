import SocketIO, { Socket } from 'socket.io-client';
import { UNLOGGER_HOST } from '../../config';

export default class UnloggerClient {
  socket: Socket;

  constructor() {
    this.socket = SocketIO(UNLOGGER_HOST);
  }

  seek(dongleId: string, name: string, seekSeconds: number) {
    this.socket.emit('seek', dongleId, name, seekSeconds);
  }
}

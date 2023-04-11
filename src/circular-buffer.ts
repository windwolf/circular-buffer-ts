export class CircularBuffer {
    private _buffer: Uint8Array;
    private _capacity: number;
    private _write: number;
    private _read: number;

    constructor(capacity: number) {
        this.assertPowerOfTwo(capacity);
        this._capacity = capacity;
        this._buffer = new Uint8Array(capacity);
        this._write = 0;
        this._read = 0;
    }

    private assertPowerOfTwo(capacity: number) {
        if (capacity & (capacity - 1)) {
            throw new Error(`Capacity must be a power of two. ${capacity} is not.`);
        }
    }

    public isFull(): boolean {
        return this._read === (this._write ^ this._capacity);
    }

    public isEmpty(): boolean {
        return this._write === this._read;
    }

    public getSize(): number {
        return (this._write - this._read) & ((this._capacity << 1) - 1);
    }

    public getSpace(): number {
        return this._capacity - this.getSize();
    }

    /**
     * Wirte data into buffer
     * @param data Data to be written.
     * @param allowCover Allow cover the data in buffer if the buffer is full.
     * If not, only the data that can be written will be written.
     * @note If allowCover is true, this function will modify the read index,
     * and user code should handle the concurrent problem.
     * @return The length of data that is written into buffer.
     */
    public write(data: Uint8Array, allowCover = true): number {
        let overflow = false;
        let dataOffset = 0;
        const space = this.getSpace();
        let length = data.length;
        if (length > space) {
            if (allowCover) {
                if (length > this._capacity) {
                    length = this._capacity;
                    dataOffset = length - this._capacity;
                }
                overflow = true;
            } else {
                length = space;
            }
        }
        const writeMemIndex = this.wrapMemIndex(this._write);
        const roomFromWriteToBotton = this._capacity - writeMemIndex;
        if (length <= roomFromWriteToBotton) {
            this._buffer.set(
                new Uint8Array(data.buffer, dataOffset, length),
                writeMemIndex
            );
        } else {
            this._buffer.set(
                new Uint8Array(data.buffer, dataOffset, roomFromWriteToBotton),
                writeMemIndex
            );
            this._buffer.set(
                new Uint8Array(
                    data.buffer,
                    dataOffset + roomFromWriteToBotton,
                    length - roomFromWriteToBotton
                ),
                0
            );
        }
        this._write = this.wrapLogicIndex(this._write + length);

        if (overflow) {
            this._read = this.wrapLogicIndex(this._write - this._capacity);
        }

        return length;
    }

    /**
     * Forward the write index after the data is written into the buffer by the
     * external device such as DMA.
     * @note  User code should handle the concurrency issue, if the start index
     * is pushed over the end index.
     * @remark This function is mainly used for DMA transfer, so it can not
     * avoid the data cover issue. But generally speaking, the DMA speed is much
     * slower than the CPU, so it is not easy to cause data cover.
     * @param length The length of data that has been written into buffer by the
     * external device.
     * @return If overflow occurs, return true, otherwise return false.
     */
    public writeVirtual(length: number): boolean {
        const space = this.getSpace();
        let overflow = false;
        if (length > space) {
            if (length > this._capacity) {
                length = this._capacity;
            }
            overflow = true;
        }
        this._write = this.wrapLogicIndex(this._write + length);
        if (overflow) {
            this._read = this.wrapLogicIndex(this._write - this._capacity);
        }
        return overflow;
    }

    /**
     * Read data from buffer. If buffer has enough
     * @param length
     * @return  The data read from buffer.
     */
    public read(length: number): Uint8Array {
        const size = this.getSize();
        if (length > size) {
            length = size;
        }
        const data = new Uint8Array(length);
        const readMemIndex = this.wrapMemIndex(this._read);
        const roomFromReadToBotton = this._capacity - readMemIndex;
        if (length <= roomFromReadToBotton) {
            data.set(new Uint8Array(this._buffer.buffer, readMemIndex, length));
        } else {
            data.set(
                new Uint8Array(this._buffer.buffer, readMemIndex, roomFromReadToBotton)
            );
            data.set(
                new Uint8Array(this._buffer.buffer, 0, length - roomFromReadToBotton),
                roomFromReadToBotton
            );
        }
        this._read = this.wrapLogicIndex(this._read + length);
        return data;
    }
    /**
     * @brief Forward the read index after the data is readed from the buffer by
     * the external device such as DMA.
     * @note User code should handle the concurrency issue, if the start index
     * is pushed over the end index.
     * @param length The length of data that has been read from buffer.
     * @return If overflow occurs, return true, otherwise return false.
     */
    public readVirtual(length: number): boolean {
        const size = this.getSize();
        let overflow = false;
        if (length > size) {
            overflow = true;
            length = size;
        }
        this._read = this.wrapLogicIndex(this._read + length);
        if (overflow) {
            this._write = this._read;
        }
        return overflow;
    }
    public peek(start = 0, length = 1): Uint8Array | null {
        const size = this.getSize();
        if (start >= size) {
            return null;
        }
        if (length > size - start) {
            length = size - start;
        }
        const readMemIndex = this.wrapMemIndex(this._read + start);
        const roomFromReadToBotton = this._capacity - readMemIndex;
        if (length <= roomFromReadToBotton) {
            return new Uint8Array(this._buffer.buffer, readMemIndex, length);
        } else {
            const data = new Uint8Array(length);
            data.set(
                new Uint8Array(this._buffer.buffer, readMemIndex, roomFromReadToBotton)
            );
            data.set(
                new Uint8Array(this._buffer.buffer, 0, length - roomFromReadToBotton),
                roomFromReadToBotton
            );
            return data;
        }
    }

    public peekOne(offset: number, force = false): number | null {
        if (force) {
            return this._buffer[this.wrapMemIndex(this._read)];
        } else {
            if (offset >= this.getSize()) {
                return null;
            }
            return this._buffer[this.wrapMemIndex(this._read + offset)];
        }
    }

    clear() {
        this._write = 0;
        this._read = 0;
    }

    private wrapMemIndex(i: number): number {
        return i & (this._capacity - 1);
    }
    private wrapLogicIndex(i: number): number {
        return i & ((this._capacity << 1) - 1);
    }
}

import { CircularBuffer } from "../circular-buffer";
test("new", () => {
  expect(() => {
    new CircularBuffer(6);
  }).toThrowError(new Error("Capacity must be a power of two. 6 is not."));
  expect(() => {
    new CircularBuffer(8);
  }).not.toThrowError();
});
test("write without cover", () => {
  let cb = new CircularBuffer(8);
  expect(cb.write(new Uint8Array([1, 2, 3, 4, 5]), false)).toBe(5);
  expect(cb.getSize()).toBe(5);
  expect(cb.getSpace()).toBe(3);
  expect(cb.write(new Uint8Array([6, 7]), false)).toBe(2);
  expect(cb.getSize()).toBe(7);
  expect(cb.getSpace()).toBe(1);
  expect(cb.write(new Uint8Array([9, 10]), false)).toBe(1);
  expect(cb.getSize()).toBe(8);
  expect(cb.getSpace()).toBe(0);
  expect(cb.write(new Uint8Array([11]), false)).toBe(0);
  expect(cb.getSize()).toBe(8);
  expect(cb.getSpace()).toBe(0);
});

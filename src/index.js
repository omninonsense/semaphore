// @flow
class SemaphoreError extends Error {}
class SemaphoreAbortedError extends SemaphoreError {}


type ReleaseFn = () => void
type Waiting = {
  resolve: (release: ReleaseFn) => void,
  reject: <E: SemaphoreError>(error: E) => void
}


class Semaphore {
  _limit: number;
  _running: number;
  _waiting: Waiting[];
  _aborted: boolean;

  constructor(limit: number) {
    if (!limit || (typeof limit === "number" && limit < 1)) {
      throw new SemaphoreAbortedError("Limit must be a positive integer!")
    }

    this._limit = limit
    this._running = 0
    this._waiting = []
    this._aborted = false
  }

  /**
   * Releases the resource.
   * @private
   */
  _release = () => {
    --this._running

    if (this._running < 0) {
      // This can go negative for two reasons:
      //  1. we aborted and there were async functions running after they acquired the lock
      //  2. `Semaphore.prototype._release()` was called twice
      //
      // The first case is kinda fine, the second one could be a bit troubling.
      this._running = 0
    }

    const next = this._waiting.shift()

    if (next) {
      setTimeout(() => {
        ++this._running
        next.resolve(this._makeSafeRelease())
      }, 0)
    }
  }

  /**
   * Makes a version of the release function that is effective only once.
   * @private
   */
  _makeSafeRelease = (): ReleaseFn => {
    let released = false
    let warned = false

    const safeRelease = () => {
      if (released) {
        if (!warned) {
          console.error("The same release function was called more than once!")
          warned = true
        }

        return
      }

        released = true
        this._release()
    }

    return safeRelease
  }

  /**
   * Acquire access to the resource.
   * As a safety convenience, this function returns a promise that resolves into the release function.
   * The benefit of this approach function is that it guards against accidental multiple-releases.
   *
   * @returns {Promise<ReleaseFn>} The resolve function wrapped in a promise
   *
   * @example
   *     const semaphore = new Semaphore(2)
   *     async function someTask() {
   *        const release = semaphore.await()
   *        await doSomething(resource)
   *        release()
   *     }
   *
   */
  acquire = (): Promise<ReleaseFn> => {
    if (this._aborted)
      return Promise.reject(new SemaphoreAbortedError("Semaphore was aborted!"))

    if (this._running < this._limit) {
      ++this._running
      // We have enough resources, let's acquire immediately
      return Promise.resolve(this._makeSafeRelease())
    } else {
      // Queue the resolve and reject functions
      return new Promise((resolve, reject) => this._waiting.push({resolve, reject}))
    }
  }

  /**
   * This can be used if whatever resource was guarded by the semaphore became unavailable.
   */
  abort = () => {
    for (const next of this._waiting) {
      next.reject(new SemaphoreAbortedError("Semaphore has been aborted before this task could complete"))
    }

    this._running = 0
    this._waiting = []
    this._aborted = true
  }

  /**
   * An convenient way to use the Semaphore with async tasks. The lock is required automatically and released automatically
   *
   * @param {() => Promise<R>} task Async function that depends on the resource acquisition.
   * @returns {Promise<R>} The return value of the task. In case of an error, it returns a rejected promise with the error.
   *
   * @example
   *    const semaphore = new Semaphore(2)
   *     semaphore.withAcquisition(async () => {
   *       await doSomething(resource)
   *     })
   */
  withAcquisition = async <R>(task: () => R): Promise<R> => {
    await this.acquire()

    try {
      return await task()
    } finally {
      this._release()
    }
  }
}

export default Semaphore

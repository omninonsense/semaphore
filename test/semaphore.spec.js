import Semaphore from '../src'
const asleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const CONCURRENCY=2

describe("Semaphore",() => {
  it("limits access", async () => {
    const sem = new Semaphore(CONCURRENCY)
    let running = 0
    const task = async (id) => {
      const release = await sem.acquire()
      running++

      await asleep(10)
      expect(running).toBeLessThanOrEqual(CONCURRENCY)

      running--
      release()

      return id
    }

    await Promise.all([
      task(1),
      task(2),
      task(3),
      task(4),
      task(5),
    ])
  })

  it("runs all tasks", async () => {
    const sem = new Semaphore(CONCURRENCY)
    let finished = 0
    const task = async (id) => {
      const release = await sem.acquire()
      finished++
      release()
      return id
    }

    await Promise.all([
      task(1),
      task(2),
      task(3),
      task(4),
      task(5),
    ])

    expect(finished).toBe(5)
  })

  describe("withAcquisition API", () => {
    it("handles acquisition and release automatically", async () => {
      const sem = new Semaphore(CONCURRENCY)
      let running = 0
      const task = async (id) => {
        running++

        await asleep(10)
        expect(running).toBeLessThanOrEqual(CONCURRENCY)

        running--

        return id
      }

      await Promise.all([
        sem.withAcquisition(() => task(1)),
        sem.withAcquisition(() => task(2)),
        sem.withAcquisition(() => task(3)),
        sem.withAcquisition(() => task(4)),
        sem.withAcquisition(() => task(5)),
      ])
    })

    it("runs all tasks", async () => {
      const sem = new Semaphore(CONCURRENCY)
      let finished = 0
      const task = async (id) => {
        finished++
        return id
      }

      await Promise.all([
        sem.withAcquisition(() => task(1)),
        sem.withAcquisition(() => task(2)),
        sem.withAcquisition(() => task(3)),
        sem.withAcquisition(() => task(4)),
        sem.withAcquisition(() => task(5)),
      ])

      expect(finished).toBe(5)
    })

    it("returns properly from tasks", async () => {
      const sem = new Semaphore(CONCURRENCY)
      let list = [1,2,3,4,5]
      const task = async (id) => {
        return id
      }

      await Promise.all([
        sem.withAcquisition(() => task(1)),
        sem.withAcquisition(() => task(2)),
        sem.withAcquisition(() => task(3)),
        sem.withAcquisition(() => task(4)),
        sem.withAcquisition(() => task(5)),
      ])

      expect(list).toEqual([1,2,3,4,5])
    })

    it("handles errors inside tasks", async () => {
      const sem = new Semaphore(CONCURRENCY)
      let started = 0, finished = 0, errored = 0
      const task = async (id) => {
        started++
        finished++
        return id
      }

      const brokenTask = async (id) => {
        started++
        throw new Error(`oops from ${id}`)
      }

      await sem.withAcquisition(() => task(1))
      await sem.withAcquisition(() => task(2))

      try {
        await sem.withAcquisition(() => task(3))
        await sem.withAcquisition(() => brokenTask(4))
      } catch (error) {
        console.log(error)
        errored = 1
      }

      await sem.withAcquisition(() => task(5))

      expect(started).toBe(5)
      expect(finished).toBe(4)
      expect(errored).toBe(1)
    })
  })
})

# Async Semaphore

This (tiny) package provides a simple [semaphore](https://en.wikipedia.org/wiki/Semaphore_(programming)) implementation for usage with async code.

## Installation

~~~console
$ npm i --save  @gambit/semaphore
~~~

## Usage

There are two ways to use the samaphore. Autoamtic `withAcquisition` and manual (calling `acquire` and `release` manually)

### Simple/automatic

With the simple API the semaphore is acquired and released automatically at the start and end of the function respectively. If there is an exception in the function, the resource will be released, too. Return values of the functions are respected.

Here is a demo:

~~~javascript
import Seamphore from '@gambit/semaphore'

const asleep = (time) => new Promise(res => setTimeout(res, time))

function task(id) {
  return async () => {
    console.log(`Spawning task ${id}`)
    await asleep(2000)
    console.log(`Ending task ${id}`)

    return id
  }
}

const s = new Semaphore(2)

s.withAcquisition(task(1))
s.withAcquisition(task(2))
s.withAcquisition(task(3))
s.withAcquisition(task(4))
s.withAcquisition(task(5))
~~~

You should see something like this in your console:

~~~
Spawning task 1
Spawning task 2
<2 second pause>

Ending task 1
Ending task 2
Spawning task 3
Spawning task 4
<2 second pause>

Ending task 3
Ending task 4
Spawning task 5
<2 second pause>

Ending task 5
~~~

## Manual

With the manual approach, you're given slightly more control,.

~~~javascript
import Seamphore from '@gambit/semaphore'

// Emulate slowness
const asleep = (time) => new Promise(res => setTimeout(res, time))

async function task(sem, id) {
  // Acquire the lock, don't forget to await it
  const release = await sem.acquire()

  console.log(`Spawning task ${id}`)
  await asleep(2000)
  console.log(`Ending task ${id}`)

  // We are done with it, so we can release it
  release()

  return id
}

const s = new Semaphore(2)

task(s, 1)
task(s, 2)
task(s, 3)
task(s, 4)
task(s, 5)
~~~

The console output should be the same as from the previous example.

## Usage as a Mutex

You could use the `Seamphore` class as mutex by creating an instance with limit set to 1:

~~~javascript
const lock = new Seamphore(1)
~~~


# API
## `Semaphore`
### `Semaphore.prototype.constructor(limit: number)`

Creates a new instance of a seamphore


**Example**
~~~javascript
const semaphore = new Semaphore(3)
~~~

-----
### `Semaphore.prototype.acquire(): Promise<() => void>`

Returns a promise, which will eventually resolve into a release function.

Alternativley, it can reject into a `SemaphoreAbortedError` because the Semaphore was aborted (see `Semaphore.prototype.abort`).


**Example**
~~~javascript
const release = await semaphore.acquire()
// do stuff
release()
~~~

-----
### `Semaphore.prototype.withAcquisition<R>(() => R): Promise<R>`

A simplified version of `acquire` using `acquire` which handles exceptions and
Receives a single function as an argument. Waits for acquisition, runs the function,
and at the end of the function (whether it ran successfully or not) it will release the lock.

It respects return values of the function being passed in. If there was an exception
_after_ the lock was acquired, the promise will reject with the failure inside the promise.

Has same semantics as `Promise.prototype.acquire` if the seamphore was aborted.


**Example**
~~~javascript
semaphore.withAcquisition(async function() {
  // do stuff
})
~~~

-----
### `Semaphore.prototype.abort()`

Abort the seamphore, in case the resource it guards becomes unavailable for whatever reason.

Once aborted, a seamphore cannot be reused. Any attempts to acquire a lock on the seamphore will
result in a rejected promise. Any pending acquisitions will be rejected.


**Example**
~~~javascript
semaphore.abort()
~~~

## TODO

- Look into using `neutrino` instead of `rollup` since it might make things simpler

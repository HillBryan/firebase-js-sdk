/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '../testing/setup';

import * as registerModule from '../helpers/registerDefaultSw';
import * as tokenManagerModule from '../internals/token-manager';
import { deleteToken } from './deleteToken';
import { stub, restore } from 'sinon';
import { expect } from 'chai';
import { getFakeMessagingService } from '../testing/fakes/messaging-service';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { Stub } from '../testing/sinon-types';

describe('deleteToken', () => {
  let messaging: ReturnType<typeof getFakeMessagingService>;
  let fakeServiceWorkerRegistration: FakeServiceWorkerRegistration;
  let deleteTokenInternalStub: Stub<
    (typeof tokenManagerModule)['deleteTokenInternal']
  >;
  let registerDefaultSwStub: Stub<(typeof registerModule)['registerDefaultSw']>;

  beforeEach(() => {
    messaging = getFakeMessagingService();
    fakeServiceWorkerRegistration = new FakeServiceWorkerRegistration();
    stub(globalThis as any, 'ServiceWorkerRegistration').value(
      FakeServiceWorkerRegistration
    );

    deleteTokenInternalStub = stub(
      tokenManagerModule,
      'deleteTokenInternal'
    ).resolves(true);
    registerDefaultSwStub = stub(registerModule, 'registerDefaultSw').callsFake(
      async (msg: typeof messaging) => {
        msg.swRegistration = fakeServiceWorkerRegistration;
      }
    );
  });

  afterEach(() => {
    restore();
  });

  it('If navigator is missing, an error is thrown', async () => {
    stub(globalThis, 'navigator').value(undefined);

    await expect(deleteToken(messaging)).to.be.rejectedWith(
      'messaging/only-available-in-window'
    );

    expect(registerDefaultSwStub).not.to.have.been.called;
    expect(deleteTokenInternalStub).not.to.have.been.called;
  });

  it('If no options are present, the default service should be registered', async () => {
    await deleteToken(messaging);

    expect(messaging.swRegistration).to.equal(fakeServiceWorkerRegistration);
    expect(registerDefaultSwStub).to.have.been.calledOnceWith(messaging);
    expect(deleteTokenInternalStub).to.have.been.calledOnceWith(messaging);
  });

  it('If a service worker is already registered, the registration should not be changed', async () => {
    const existing = new FakeServiceWorkerRegistration();
    messaging.swRegistration = existing;

    await deleteToken(messaging);

    expect(messaging.swRegistration).to.equal(existing);
    expect(registerDefaultSwStub).not.to.have.been.called;
    expect(deleteTokenInternalStub).to.have.been.calledOnceWith(messaging);
  });

  it('If given service worker is not a true service worker, an error should be thrown', async () => {
    await expect(
      deleteToken(messaging, {
        serviceWorkerRegistration: {} as unknown as ServiceWorkerRegistration
      })
    ).to.be.rejectedWith('messaging/invalid-sw-registration');

    expect(messaging.swRegistration).to.equal(undefined);
    expect(registerDefaultSwStub).not.to.have.been.called;
    expect(deleteTokenInternalStub).not.to.have.been.called;
  });

  it('If the given service worker is defined, it should be used in place of the default service worker', async () => {
    const options = {
      serviceWorkerRegistration: new FakeServiceWorkerRegistration()
    };

    await deleteToken(messaging, options);

    expect(messaging.swRegistration).to.equal(
      options.serviceWorkerRegistration
    );
    expect(registerDefaultSwStub).not.to.have.been.called;
    expect(deleteTokenInternalStub).to.have.been.calledOnceWith(messaging);
  });
});

import {expect} from 'chai';
import {spec} from 'modules/adbutlerBidAdapter';

describe('AdButler adapter', () => {
  let bidRequests;

  beforeEach(() => {
    bidRequests = [
      {
        bidder: 'adbutler',
        params: {
          accountID: '167283',
          zoneID: '210093',
          keyword: 'red',
          minCPM: '1.00',
          maxCPM: '5.00'
        },
        placementCode: '/19968336/header-bid-tag-1',
        sizes: [[300, 250], [300, 600]],
        bidId: '23acc48ad47af5',
        requestId: '0fb4905b-9456-4152-86be-c6f6d259ba99',
        bidderRequestId: '1c56ad30b9b8ca8',
        transactionId: '92489f71-1bf2-49a0-adf9-000cea934729'
      }
    ];
  });

  describe('implementation', () => {
    describe('for requests', () => {
      it('should accept valid bid', () => {
        let validBid = {
            bidder: 'adbutler',
            params: {
              accountID: '167283',
              zoneID: '210093'
            }
          },
          isValid = spec.isBidRequestValid(validBid);

        expect(isValid).to.equal(true);
      });

      it('should reject invalid bid', () => {
        let invalidBid = {
            bidder: 'adbutler',
            params: {
              accountID: '167283',
            }
          },
          isValid = spec.isBidRequestValid(invalidBid);

        expect(isValid).to.equal(false);
      });

      it('should use custom domain string', () => {
        let bidRequests = [
            {
              bidId: '3c9408cdbf2f68',
              sizes: [[300, 250]],
              bidder: 'adbutler',
              params: {
                accountID: '107878',
                zoneID: '86133',
                domain: 'servedbyadbutler.com.dan.test'
              },
              requestId: '10b327aa396609',
              placementCode: '/123456/header-bid-tag-1'
            }
          ],
          requests = spec.buildRequests(bidRequests),
          requestURL = requests[0].url;

        expect(requestURL).to.have.string('.dan.test');
      });

      it('should set default domain', () => {
        let requests = spec.buildRequests(bidRequests),
          request = requests[0];

        let [domain] = request.url.split('/adserve/');

        expect(domain).to.equal('http://servedbyadbutler.com');
      });

      it('should set the keyword parameter', () => {
        let requests = spec.buildRequests(bidRequests),
          requestURL = requests[0].url;

        expect(requestURL).to.have.string(';kw=red;');
      });

      it('should increment the count for the same zone', () => {
        let bidRequests = [
            {
              sizes: [[300, 250]],
              bidder: 'adbutler',
              params: {
                accountID: '107878',
                zoneID: '86133',
                domain: 'servedbyadbutler.com.dan.test'
              }
            }, {
              sizes: [[300, 250]],
              bidder: 'adbutler',
              params: {
                accountID: '107878',
                zoneID: '86133',
                domain: 'servedbyadbutler.com.dan.test'
              }
            },
          ],
          requests = spec.buildRequests(bidRequests),
          firstRequest = requests[0].url,
          secondRequest = requests[1].url;

        expect(firstRequest).to.have.string(';place=0;');
        expect(secondRequest).to.have.string(';place=1;');
      });
    });

    describe('bid responses', () => {
      it('should return complete bid response', () => {
        let serverResponse = {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 1.5,
            width: 300,
            height: 250,
            place: 0,
            ad_code: '<img src="http://image.source.com/img" alt="" title="" border="0" width="300" height="250">',
            tracking_pixels: [
              'http://tracking.pixel.com/params=info'
            ]
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(1);

        expect(bids[0].bidderCode).to.equal('adbutler');
        expect(bids[0].cpm).to.equal(1.5);
        expect(bids[0].width).to.equal(300);
        expect(bids[0].height).to.equal(250);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ad).to.have.length.above(1);
        expect(bids[0].ad).to.have.string('http://tracking.pixel.com/params=info');
      });

      it('should return empty bid response', () => {
        let serverResponse = {
            status: 'NO_ELIGIBLE_ADS',
            zone_id: 210083,
            width: 300,
            height: 250,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response on incorrect size', () => {
        let serverResponse = {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210083,
            cpm: 1.5,
            width: 728,
            height: 90,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with CPM too low', () => {
        let serverResponse = {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 0.75,
            width: 300,
            height: 250,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });

      it('should return empty bid response with CPM too high', () => {
        let serverResponse = {
            status: 'SUCCESS',
            account_id: 167283,
            zone_id: 210093,
            cpm: 7.00,
            width: 300,
            height: 250,
            place: 0
          },
          bids = spec.interpretResponse(serverResponse, {'bidRequest': bidRequests[0]});

        expect(bids).to.be.lengthOf(0);
      });
    });
  });
});

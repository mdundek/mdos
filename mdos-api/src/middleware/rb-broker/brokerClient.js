const exitHook = require('async-exit-hook');
const BrokerBase = require('./brokerBase.js');
const { CHANNEL } = require('./constant');

/**
 * MDosBrokerClient
 */
class MDosBrokerClient extends BrokerBase {

    /**
     * constructor
     * @param {*} brokerUrl the broker IP or Domain name 
     */
    constructor(brokerUrl, manualConnect) {
        super();
        // this.broker = new brokerClient(brokerUrl);  
        this.brokerUrl = `amqp://${brokerUrl}`;
        this.connected = false;
        this.connection = null;
        
        this.publishAckTimeouts = [];
        
        this.channel = {};
        this.channel[CHANNEL.JOB_DISPATCHER] = null;
        this.channel[CHANNEL.JOB_SYNC_LOAD] = null;
        this.channel[CHANNEL.JOB_SYNC_PUSH] = null;
        this.channel[CHANNEL.JOB_SYNC_PULL] = null;
        this.channel[CHANNEL.JOB_DEPLOY] = null;
        this.channel[CHANNEL.JOB_DEPLOY_FLIPFLOP] = null;
        this.channel[CHANNEL.JOB_BUNDLE_OPS_MERGE] = null;
        this.channel[CHANNEL.JOB_BUNDLE_OPS_EVALUATE] = null;
        this.channel[CHANNEL.JOB_BUNDLE_OPS_BACKUP] = null;
        this.channel[CHANNEL.JOB_UNINSTALL_APP] = null;
        this.channel[CHANNEL.UNCOMPRESS] = null;
        this.channel[CHANNEL.SCHEDULE_BM_SYNC] = null;

        this.consumerInstances = {};
        exitHook(async () => {
            if(this.connected) {
                console.log("Closing EMQP connection...");
                await this._closeChannels();
                try { await this.connection.close(); } catch (error) {}
            }
        });
        if(!manualConnect)
            this.connect().then(() => {}).catch((err) => {});
    }

    /**
    * waitForConnection
    */
    async waitForConnection() {
        while(!this.connected) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    /**
     * publishJobDispatcher
     */
    async publishJobDispatcher(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_DISPATCHER, message);
        } else {
            throw new Error("Broker disconected");
        }         
    }

    /** 
     * subscribeJobDispatcher
     */
    async subscribeJobDispatcher(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_DISPATCHER]) {
            await this._consume(CHANNEL.JOB_DISPATCHER, cb, prefetch);
            this.consumerInstances[CHANNEL.JOB_DISPATCHER] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
    * unsubscribeJobDispatcher
    */
    async unsubscribeJobDispatcher(){
        if(this.connected && this.channel[CHANNEL.JOB_DISPATCHER]) {
           await this.channel[CHANNEL.JOB_DISPATCHER].cancel(CHANNEL.JOB_DISPATCHER);
        }
        delete this.consumerInstances[CHANNEL.JOB_DISPATCHER];
    }

    /**
    * publishSyncLoadJob
    */
    async publishSyncLoadJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_SYNC_LOAD, message);
        } else {
            throw new Error("Broker disconected");
        }   
    }

    /**
    * subscribeSyncLoadJob
    */
    async subscribeSyncLoadJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_LOAD]) {
            await this._consume(CHANNEL.JOB_SYNC_LOAD, cb);
            this.consumerInstances[CHANNEL.JOB_SYNC_LOAD] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
    * unsubscribeSyncLoadJob
    */
    async unsubscribeSyncLoadJob(){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_LOAD]) {
           await this.channel[CHANNEL.JOB_SYNC_LOAD].cancel(CHANNEL.JOB_SYNC_LOAD);
        }
        delete this.consumerInstances[CHANNEL.JOB_SYNC_LOAD];
    }

    /**
    * publishDeployAppJob
    */
    async publishDeployAppJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_DEPLOY, message);
        } else {
            throw new Error("Broker disconected");
        }   
    }

    /**
    * subscribeDeployAppJob
    */
    async subscribeDeployAppJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_DEPLOY]) {
            await this._consume(CHANNEL.JOB_DEPLOY, cb);
            this.consumerInstances[CHANNEL.JOB_DEPLOY] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
    * unsubscribeDeployAppJob
    */
    async unsubscribeDeployAppJob(){
        if(this.connected && this.channel[CHANNEL.JOB_DEPLOY]) {
           await this.channel[CHANNEL.JOB_DEPLOY].cancel(CHANNEL.JOB_DEPLOY);
        }
        delete this.consumerInstances[CHANNEL.JOB_DEPLOY];
    }

    /**
     * publishUncompressBundle
     */
    async publishUncompressBundle(message){
        if(this.connected) {
            await this._produce(CHANNEL.UNCOMPRESS, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
     * subscribeUncompressBundle
     */
    async subscribeUncompressBundle(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.UNCOMPRESS]) {
            await this._consume(CHANNEL.UNCOMPRESS, cb);
            this.consumerInstances[CHANNEL.UNCOMPRESS] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeUncompressBundle
     */
    async unsubscribeUncompressBundle(){
        if(this.connected && this.channel[CHANNEL.UNCOMPRESS]) {
            await this.channel[CHANNEL.UNCOMPRESS].cancel(CHANNEL.UNCOMPRESS);
         }
         delete this.consumerInstances[CHANNEL.UNCOMPRESS];
    }


    /**
     * publishSyncPushJob
     */
     async publishSyncPushJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_SYNC_PUSH, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
     * subscribeSyncPushJob
     */
     async subscribeSyncPushJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_PUSH]) {
            await this._consume(CHANNEL.JOB_SYNC_PUSH, cb);
            this.consumerInstances[CHANNEL.JOB_SYNC_PUSH] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeSyncPushJob
     */
     async unsubscribeSyncPushJob(){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_PUSH]) {
            await this.channel[CHANNEL.JOB_SYNC_PUSH].cancel(CHANNEL.JOB_SYNC_PUSH);
        }
        delete this.consumerInstances[CHANNEL.JOB_SYNC_PUSH];
    }

    /**
     * publishSyncPullJob
     */
     async publishSyncPullJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_SYNC_PULL, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
     * subscribeSyncPullJob
     */
     async subscribeSyncPullJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_PULL]) {
            await this._consume(CHANNEL.JOB_SYNC_PULL, cb);
            this.consumerInstances[CHANNEL.JOB_SYNC_PULL] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeSyncPullJob
     */
     async unsubscribeSyncPullJob(){
        if(this.connected && this.channel[CHANNEL.JOB_SYNC_PULL]) {
            await this.channel[CHANNEL.JOB_SYNC_PULL].cancel(CHANNEL.JOB_SYNC_PULL);
         }
         delete this.consumerInstances[CHANNEL.JOB_SYNC_PULL];
    }

    /**
    * subscribeBundleOpsMergeJob
    */
     async subscribeBundleOpsMergeJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_MERGE]) {
            await this._consume(CHANNEL.JOB_BUNDLE_OPS_MERGE, cb);
            this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_MERGE] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeBundleOpsMergeJob
     */
     async unsubscribeBundleOpsMergeJob(){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_MERGE]) {
            await this.channel[CHANNEL.JOB_SYNC_PULL].cancel(CHANNEL.JOB_BUNDLE_OPS_MERGE);
         }
         delete this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_MERGE];
    }

    /**
     * publishBundleOpsMergeJob
     */
     async publishBundleOpsMergeJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_BUNDLE_OPS_MERGE, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
    * subscribeBundleOpsBackupJob
    */
     async subscribeBundleOpsBackupJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_BACKUP]) {
            await this._consume(CHANNEL.JOB_BUNDLE_OPS_BACKUP, cb);
            this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_BACKUP] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeBundleOpsBackupJob
     */
     async unsubscribeBundleOpsBackupJob(){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_BACKUP]) {
            await this.channel[CHANNEL.JOB_SYNC_PULL].cancel(CHANNEL.JOB_BUNDLE_OPS_BACKUP);
         }
         delete this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_BACKUP];
    }

    /**
     * publishBundleOpsBackupJob
     */
     async publishBundleOpsBackupJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_BUNDLE_OPS_BACKUP, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
    * subscribeBundleOpsEvaluateJob
    */
     async subscribeBundleOpsEvaluateJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_EVALUATE]) {
            await this._consume(CHANNEL.JOB_BUNDLE_OPS_EVALUATE, cb);
            this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_EVALUATE] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeBundleOpsEvaluateJob
     */
     async unsubscribeBundleOpsEvaluateJob(){
        if(this.connected && this.channel[CHANNEL.JOB_BUNDLE_OPS_EVALUATE]) {
            await this.channel[CHANNEL.JOB_SYNC_PULL].cancel(CHANNEL.JOB_BUNDLE_OPS_EVALUATE);
         }
         delete this.consumerInstances[CHANNEL.JOB_BUNDLE_OPS_EVALUATE];
    }

    /**
     * publishBundleOpsEvaluateJob
     */
     async publishBundleOpsEvaluateJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_BUNDLE_OPS_EVALUATE, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
    * subscribeDeployFlipFLopJob
    */
     async subscribeDeployFlipFLopJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_DEPLOY_FLIPFLOP]) {
            await this._consume(CHANNEL.JOB_DEPLOY_FLIPFLOP, cb);
            this.consumerInstances[CHANNEL.JOB_DEPLOY_FLIPFLOP] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeDeployFlipFLopJob
     */
     async unsubscribeDeployFlipFLopJob(){
        if(this.connected && this.channel[CHANNEL.JOB_DEPLOY_FLIPFLOP]) {
            await this.channel[CHANNEL.JOB_DEPLOY_FLIPFLOP].cancel(CHANNEL.JOB_DEPLOY_FLIPFLOP);
         }
         delete this.consumerInstances[CHANNEL.JOB_DEPLOY_FLIPFLOP];
    }

    /**
     * publishDeployFlipFLopJob
     */
     async publishDeployFlipFLopJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_DEPLOY_FLIPFLOP, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
    * subscribeScheduleBmSync
    */
     async subscribeScheduleBmSync(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.SCHEDULE_BM_SYNC]) {
            await this._consume(CHANNEL.SCHEDULE_BM_SYNC, cb);
            this.consumerInstances[CHANNEL.SCHEDULE_BM_SYNC] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribeScheduleBmSync
     */
     async unsubscribeScheduleBmSync(){
        if(this.connected && this.channel[CHANNEL.SCHEDULE_BM_SYNC]) {
            await this.channel[CHANNEL.JOB_SYNC_PULL].cancel(CHANNEL.SCHEDULE_BM_SYNC);
         }
         delete this.consumerInstances[CHANNEL.SCHEDULE_BM_SYNC];
    }

    /**
     * publishScheduleBmSync
     */
     async publishScheduleBmSync(message){
        if(this.connected) {
            await this._produce(CHANNEL.SCHEDULE_BM_SYNC, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }

    /**
    * subscribeUninstallAppJob
    */
     async subscribeUninstallAppJob(cb, prefetch){
        if(this.connected && this.channel[CHANNEL.JOB_UNINSTALL_APP]) {
            await this._consume(CHANNEL.JOB_UNINSTALL_APP, cb);
            this.consumerInstances[CHANNEL.JOB_UNINSTALL_APP] = {
                cb: cb,
                prefetch: prefetch ? (typeof prefetch === 'string' ? parseInt(prefetch) : prefetch) : 1
            };
        } else {
            throw new Error("Broker disconected");
        }  
    }

    /**
     * unsubscribUninstallAppJob
     */
     async unsubscribUninstallAppJob(){
        if(this.connected && this.channel[CHANNEL.JOB_UNINSTALL_APP]) {
            await this.channel[CHANNEL.JOB_UNINSTALL_APP].cancel(CHANNEL.JOB_UNINSTALL_APP);
         }
         delete this.consumerInstances[CHANNEL.JOB_UNINSTALL_APP];
    }

    /**
     * publishUninstallAppJob
     */
     async publishUninstallAppJob(message){
        if(this.connected) {
            await this._produce(CHANNEL.JOB_UNINSTALL_APP, message);
        } else {
            throw new Error("Broker disconected");
        } 
    }
}

module.exports = MDosBrokerClient;

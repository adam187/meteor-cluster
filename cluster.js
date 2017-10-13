var cluster = Npm.require('cluster');
var os = Npm.require('os');
var settings = _.defaults(Meteor.settings.cluster || {}, {
  disable: false,
  count: 1,
  exec: ''
});


Cluster = {
  masterCallbacks: [],
  workerCallbacks: [],
  isMaster: cluster.isMaster,
  isWorker: cluster.isWorker,

  startupMaster: function(fn) {
    this.masterCallbacks.push(fn)
  },

  startupWorker: function(fn) {
    this.workerCallbacks.push(fn);
  },

  runCallbacks: function(callbacks) {
    _.each(callbacks, function(callback) {
      callback.call(this);
    });
  },

  startup: function() {
    // skip for meteorhacks:cluster workers
    if (process.env['CLUSTER_WORKER_ID']) {
      return;
    }
    if (settings.disable) return;
    if (this.isMaster) {
      if (settings.exec) {
        cluster.setupMaster({
          exec: 'assets/app/' + settings.exec
        });
        this.start();
      } else {
        this.start();
        this.runCallbacks(this.masterCallbacks);
      }
    } else {
      this.runCallbacks(this.workerCallbacks);
    }
  },

  startWorker: function() {
    if (_.size(cluster.workers) >= settings.count) {
      return;
    }

    self = this;

    var worker = cluster.fork( {PORT: 0, VELOCITY: 0} );
    worker.on('exit', function() {
      self.log('Worker process killed.');
      self.restartWorker();
    });
  },

  restartWorker: function() {
    self = this;
    setTimeout(function() {
      self.log('Restarting worker process.');
      self.startWorker();
    });
  },

  start: function() {
    self = this;
    if (_.size(cluster.workers) === 0) {
      for (var i = 0; i < settings.count; i++) {
        this.startWorker();
      }
    } else {
      this.log('Workers have already been started.')
    }
  },

  stop: function() {
    _.each(cluster.workers, function(worker) {
      worker.kill();
    });
  },

  log: function() {
    args = _.values(arguments);
    args.unshift(cluster.isMaster ? 'MASTER:' : 'PID ' + process.pid + ':');
    console.log.apply(this, args);
  }
};


Meteor.startup(function(){
  Cluster.startup();
});

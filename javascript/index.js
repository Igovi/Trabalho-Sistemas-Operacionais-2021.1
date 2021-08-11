var CPUs = [
    {
        process: undefined,
        quantumCounter: 0,
        lastQueue: undefined,
        output: document.querySelector('#cpu1'),
    },
    {
        process: undefined,
        quantumCounter: 0,
        lastQueue: undefined,
        output: document.querySelector('#cpu2'),
    },
    {
        process: undefined,
        quantumCounter: 0,
        lastQueue: undefined,
        output: document.querySelector('#cpu3'),
    },
    {
        process: undefined,
        quantumCounter: 0,
        lastQueue: undefined,
        output: document.querySelector('#cpu4'),
    }
]

var timePast = 0;
var processes = [];
var finishedProcesses = [];
var freeMemory = [
    {
        start: 0,
        size: 16384
    }];
var occupiedMemory = [];
var suspended = [];
var suspendedBlocked = [];
var suspendedPriority = [];
var blocked = [];
var ready1 = [];
var ready2 = [];
var ready3 = [];
var priorityQueue = [];


class Process {
    constructor(id, arrivalTime, priority, processorTime, size, disk) {
        this.arrivalTime = parseInt(arrivalTime);
        this.priority = parseInt(priority);
        this.processorTime = parseInt(processorTime);
        this.size = parseInt(size);
        this.disk = parseInt(disk);
        this.id = id;
        this.name = `P${id}`;
        this.state = "novo";
        this.remainingTime = parseInt(processorTime);
    }
}

function fillProcesses(text) {
    processes = text.split('\n').filter((e) => e.length >= 5);

    for (i = 0; i < processes.length; i++) {
        processes[i] = processes[i].replaceAll(' ', '');
        processes[i] = processes[i].split(',');
    }
    processes.sort((a, b) => {
        return parseInt(a[0]) - parseInt(b[0]);
    });

    for (i = 0; i < processes.length; i++) {
        processes[i] = new Process(i, processes[i][0], processes[i][1], processes[i][2], processes[i][3], processes[i][5]);
    }
}

function start() {

    // Define quantos segundos cada loop do simulador irá durar (1000 = 1s)
    const t = parseFloat(document.getElementById("time").value) * 1000;
    var simulationLoop = setInterval(() => {
        try {
            checkSuspended();
            checkProcesses();
            updateCPUs();
            Interface.updateQueues();
            Interface.updateMemory();
            checkEndSimulation(simulationLoop);
            updateTimer();
        }
        catch (e) {
            console.error(e);
            clearInterval(simulationLoop);
        }
    }, t);
}

function checkEndSimulation(simulationLoop) {
    if (ready1.length == 0 && ready2.length == 0 && ready3.length == 0 && processes.length == 0 && blocked.length == 0 && suspendedBlocked.length == 0 && suspended.length == 0 && !CPUs[0].process && !CPUs[1].process && !CPUs[2].process && !CPUs[3].process) {
        Interface.log(`A simulação terminou em t = ${timePast}.`);
        clearInterval(simulationLoop);
    }
}


var Interface = {
    // Output dos processos no menu
    outputP: document.getElementById('processesOutput'),
    // Altera a visualização do programa (menu->simulador)
    outputMenu: document.querySelector('.menu'),
    outputSimulator: document.querySelector('.simulator'),
    
    // Exibe a mensagem passada por parâmetro no console de eventos
    eventsOutput: document.getElementById('eventsOutput'),
    log: function (text) {
        let p = document.createElement('p');
        p.textContent = text;
        Interface.eventsOutput.appendChild(p);
        Interface.eventsOutput.scroll({
            top: Interface.eventsOutput.scrollHeight,
            behavior: 'smooth'
        });
    },
    // Atualiza a exibição dos elementos das filas
    _updateQueue: function (queue, output) {
        output.innerHTML = '';
        queue.forEach(e => {
            let li = document.createElement('li');
            li.textContent = e.name;
            output.appendChild(li);
        });
    },
    outputPQ: document.getElementById('priority'),
    outputR1Q: document.getElementById('ready1'),
    outputR2Q: document.getElementById('ready2'),
    outputR3Q: document.getElementById('ready3'),
    outputBQ: document.getElementById('blocked'),
    outputSQ: document.getElementById('suspended'),
    outputSPQ: document.getElementById('suspended-priority'),
    outputSBQ: document.getElementById('suspended-blocked'),
    updateQueues: function () {
        Interface._updateQueue(priorityQueue, Interface.outputPQ);
        Interface._updateQueue(ready1, Interface.outputR1Q);
        Interface._updateQueue(ready2, Interface.outputR2Q);
        Interface._updateQueue(ready3, Interface.outputR3Q);
        Interface._updateQueue(suspended, Interface.outputSQ);
        Interface._updateQueue(suspendedPriority, Interface.outputSPQ);
        Interface._updateQueue(blocked, Interface.outputBQ);
        Interface._updateQueue(suspendedBlocked, Interface.outputSBQ);
    },
    // Atualiza a exibição dos blocos de memória (utilizando divisão por 20 nos cálculos devido à escala utilizada)
    outputM: document.getElementById('memoryOutput'),
    _createBlock: function (mBlock, type) {
        let box = document.createElement('div');
        box.className = "escalonador-main-memory__item";
        Interface.outputM.appendChild(box);
    },
    updateMemory: function () {
        Interface.outputM.innerHTML = '';
        occupiedMemory.forEach(mBlock => {
            Interface._createBlock(mBlock, 0);
        });
        freeMemory.forEach(mBlock => {
            Interface._createBlock(mBlock, 1);
        });
    }
};

const fileInput = document.getElementById('file');
const timer = document.getElementById('timer');

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

fileInput.addEventListener('change', function () {
    var fr = new FileReader();
    fr.onload = function () {
        fillProcesses(fr.result);
    }
    //Interface.outputP.classList.remove('hidden');

    fr.readAsText(this.files[0]);
});

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
function checkSuspended() {
    let swapped = true;

    while (suspendedPriority.length > 0 && swapped == true) {
        swapped = allocateProcess(suspendedPriority[0]);
        if (swapped) {
            Interface.log(`O processo ${suspendedPriority[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${timePast}.`);
            suspendedPriority[0].state = 'pronto';
            priorityQueue.push(suspendedPriority[0]);
            suspendedPriority.shift();
        }
    }

    while (suspended.length > 0 && swapped == true) {
        swapped = allocateProcess(suspended[0]);
        if (swapped) {
            Interface.log(`O processo ${suspended[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${timePast}.`);
            suspended[0].state = 'pronto';
            ready1.push(suspended[0]);
            suspended.shift();
        }
    }

    while (suspendedBlocked.length > 0 && swapped == true) {
        swapped = allocateProcess(suspendedBlocked[0]);
        if (swapped) {
            Interface.log(`O processo ${suspended[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${timePast}.`);
            suspendedBlocked[0].state = 'pronto';
            ready1.push(suspendedBlocked[0]);
            suspendedBlocked.shift();
        }
    }
}
function allocateProcess(process) {
    let empty = -1;

    // Buscando um espaço de memória
    for (i = 0; i < freeMemory.length; i++) {
        if (freeMemory[i].size >= process.size) {
            empty = i;
            break;
        }
    }

    // Caso não tenha encontrado espaço vazio
    if (empty == -1) return false;

    // Adicionando o novo bloco de memória ocupado 
    occupiedMemory.push({
        process: process.id,
        start: freeMemory[empty].start,
        size: process.size
    });

    // Atualizando a lista de blocos livres
    if (freeMemory[empty].size == process.size) {
        freeMemory = freeMemory.filter(e => freeMemory.indexOf(e) != empty);
    }
    else {
        freeMemory[empty].size -= process.size;
        freeMemory[empty].start += process.size;
    }

    //if (infoMode) Interface.log(`O processo ${process.name} foi alocado no bloco de memória iniciado em ${occupiedMemory[occupiedMemory.length - 1].start} e com tamanho de ${occupiedMemory[occupiedMemory.length - 1].size}MBytes em t = ${timePast}.`);

    return true;
}

// Desaloca um processo da memória e atualiza a lista de blocos livres
function deallocateProcess(process) {

    let deallocated = 0;

    // Percorrendo a lista de blocos ocupados até achar o processo
    let index;
    for (i = 0; i < occupiedMemory.length; i++) {
        if (process.id == occupiedMemory[i].process) {
            index = i;
            break;
        }
    }

    // Percorrendo a lista de blocos ocupados para formar o novo bloco
    for (i = 0; i < freeMemory.length; i++) {

        // Se o bloco de ocupado está logo antes de um bloco livre
        if (freeMemory[i].start - occupiedMemory[index].size == occupiedMemory[index].start) {
            freeMemory[i].start = occupiedMemory[index].start;
            freeMemory[i].size += occupiedMemory[index].size;
            occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);
            //if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[i].start} de ${freeMemory[i].size}MBytes em t = ${timePast}.`);
            deallocated = 1;
            break;
        }

        // Se o bloco de ocupado está logo depois do bloco livre
        else if (freeMemory[i].start + freeMemory[i].size == occupiedMemory[index].start) {
            freeMemory[i].size += occupiedMemory[index].size;
            occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);
            //if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[i].start} de ${freeMemory[i].size}MBytes em t = ${timePast}.`);
            deallocated = 1;
            break;
        }
    }

    // Se o bloco de memória não tem vizinhos livres, cria-se um novo bloco de livres
    if (!deallocated) {
        freeMemory.push({
            start: occupiedMemory[index].start,
            size: occupiedMemory[index].size
        });
        occupiedMemory = occupiedMemory.filter(e => occupiedMemory.indexOf(e) != index);

        //if (infoMode) Interface.log(`O processo ${process.name} foi desalocado da memória, criando o bloco livre iniciado em ${freeMemory[freeMemory.length - 1].start} de ${freeMemory[freeMemory.length - 1].size}MBytes em t = ${timePast}.`);
    }

    // Ordenando a lista de livres pelo endereço do começo do bloco
    freeMemory.sort((a, b) => {
        return a.start - b.start;
    });

    // Buscando blocos seguidos de livres que podem surgir
    if (freeMemory.length > 1) {
        for (i = 0; i < freeMemory.length - 1; i++) {
            if (freeMemory[i].start + freeMemory[i].size == freeMemory[i + 1].start) {
                freeMemory[i].size += freeMemory[i + 1].size;
                freeMemory = freeMemory.filter((e, j) => j != i + 1);
                break;
            };
        }
    }
}

function checkProcesses() {
    while (processes.length > 0 && processes[0].arrivalTime <= timePast) {

        // Adicionando novo processo na memória
        allocated = allocateProcess(processes[0]);

        // Se não foi possível alocar o processo (prioridade 1) ele é enviado para a lista de suspensos
        if (!allocated && processes[0].priority == 1) {
            processes[0].state = "suspenso";
            Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" e foi para o estado de "Suspenso" em t = ${timePast}`)
            suspended.push(processes[0]);
        }

        // Se não foi possivel alocar o processo (prioridade 0) é realizada uma troca
        else if (!allocated && processes[0].priority == 0) {
            if (!prioritySwap(processes[0])) {
                if (!brutePrioritySwap(processes[0])) {
                    //if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de suspensos com prioridade em t = ${timePast}.`);
                    Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" para "Suspenso".`);
                    suspendedPriority.push(processes[0]);
                }
            }

        }

        // Se o processo foi alocado com sucesso, escolhe-se a fila para onde ele irá baseado em sua prioridade
        else {
            processes[0].state = "pronto";
            Interface.log(`O processo ${processes[0].name} saiu do estado "Novo" e foi para o estado de "Pronto" em t = ${timePast}.`);

            if (processes[0].priority == 0) {
                //if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${timePast}.`);
                priorityQueue.push(processes[0]);
            }
            else {
                //if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prontos 1 em t = ${timePast}.`);
                ready1.push(processes[0]);
            }
        }

        // Retira o processo da lista de processos a serem alocados
        processes.shift();
    }
}

// Busca um processo de prioridade 1 nas filas para fazer Swapping out e dar espaço ao novo de prioridade 0
function prioritySwap(process) {

    let queues = [blocked, ready3, ready2, ready1];

    // Percorrendo as filas em busca de um processo para sofrer swapping-out
    for (z = 0; z < queues.length; z++) {
        for (j = 0; j < queues[z].length; j++) {

            // Se o processo encontrado tem tamanho maior que o que queremos alocar ele é retirado de memória
            if (queues[z][j].size >= process.size) {

                // Se o processo está bloqueado deve ir para a fila de bloqueados-suspensos
                if (z == 0) {
                    //if (infomode) Interface.log(`O processo ${queues[z][j].name} saiu da fila de Bloqueados e foi enviado para a fila de Bloqueados/Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${timePast}.`);
                    Interface.log(`O processo ${queues[z][j].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${timePast}`);
                    suspendedBlocked.push(queues[z][j]);
                    queues[z][j].state = "bloqueado/suspenso";
                }
                // Caso o processo não esteja bloqueado, vai para a fila de suspensos
                else {
                    //if (infoMode) Interface.log(`O processo ${queues[z][j].name} saiu da fila de Prontos e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${timePast}.`);
                    Interface.log(`O processo ${queues[z][j].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${timePast}`);
                    suspended.push(queues[z][j]);
                    queues[z][j].state = "suspenso";
                }

                deallocateProcess(queues[z][j]);
                //if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${timePast}.`);
                Interface.log(`O processo ${processes[0].name} saiu de "Novo" para "Pronto" em t = ${timePast}.`);
                process.state = 'pronto';
                priorityQueue.push(process);

                // Removendo o processo da 
                switch (z) {
                    case 0:
                        blocked = blocked.filter(e => blocked.indexOf(e) != j);
                        break;
                    case 1:
                        ready3 = ready3.filter(e => ready3.indexOf(e) != j);
                        break;
                    case 2:
                        ready2 = ready2.filter(e => ready2.indexOf(e) != j);
                        break;
                    case 3:
                        ready1 = ready1.filter(e => ready1.indexOf(e) != j);
                        break;
                }

                // Adicionando novo processo na memória
                allocateProcess(process);

                return true;
            }
        }
    }

    return false;
}

// Implementando o swap de processos com força bruta caso não tenha um processo alocado com tamanho maior que o novo
function brutePrioritySwap(process) {
    let queues = [blocked, ready3, ready2, ready1];

    let q = 0;
    let allocated = 0;

    // Retirando os processos das filas com força bruta
    while (!allocated) {

        if (queues[q].length == 0) {
            q++;
            if (q == 4) break;
            continue;
        }

        if (q == 0) {
            //if (infoMode) Interface.log(`O processo ${blocked[0].name} saiu da fila de Bloqueados e foi enviado para a fila de Bloqueados/Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocadoem t = ${timePast}.`);
            Interface.log(`O processo ${blocked[0].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${timePast}`);
            suspendedBlocked.push(queues[q][0]);
            queues[q][0].state = 'bloqueado/suspenso';
        }
        else {
            //if (infoMode) Interface.log(`O processo ${queues[q][0].name} saiu da fila de Prontos e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocadoem t = ${timePast}.`);
            Interface.log(`O processo ${queues[q][0].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${timePast}`);
            suspended.push(queues[q][0]);
            queues[q][0].state = 'suspenso';
        }

        deallocateProcess(queues[q][0]);
        queues[q].shift();

        allocated = allocateProcess(process);
    }

    // Se o processo não conseguiu ser alocado, checar as CPUs
    let i = 0;
    while (!allocated) {
        if (i == 4) break;
        if (CPUs[i].process == undefined || CPUs[i].process.priority == 0) {
            i++;
            continue;
        };

        //if (infoMode) Interface.log(`O processo ${CPUs[i].process.name} liberou a CPU ${i + 1} e foi enviado para a fila de Suspensos para que o processo ${process.name} de prioridade superior pudesse ser alocado em t = ${timePast}.`);
        Interface.log(`O processo ${CPUs[i].process.name} saiu do estado "Executando" para o estado "Suspenso" em t = ${timePast}.`);
        CPUs[i].process.state = "suspenso";

        // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
        suspended.push(CPUs[i].process);
        deallocateProcess(CPUs[i].process);
        resetCpu(CPUs[i]);

        allocated = allocateProcess(process);
    }

    if (allocated) {
        //if (infoMode) Interface.log(`O processo ${processes[0].name} chegou na fila de prioridade em t = ${timePast}.`);
        Interface.log(`O processo ${processes[0].name} saiu de "Novo" para "Pronto" em t = ${timePast}.`);
        process.state = 'pronto';
        priorityQueue.push(process);
        return true;
    }
    return false;
}
// Atualiza o timer
function updateTimer() {
    timer.textContent = `Tempo: ${timePast}`;
    timePast += 1;
}


// Escalonador de processos
function updateCPUs() {

    // Percorrendo todas as CPUs
    CPUs.forEach((CPU, index) => {
        // Se tem processo ocupando a CPU
        if (CPU.process) {

            // Se o processo chegou ao final de sua execução
            if (CPU.process.remainingTime <= 0) {
                //if (infoMode) Interface.log(`O processo ${CPU.process.name} terminou na CPU ${index + 1} em t = ${timePast}.`);
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Finalizado" em t = ${timePast}.`);
                CPU.process.state = "finalizado";
                CPU.process.endTime = timePast;
                deallocateProcess(CPU.process);
                finishedProcesses.push(CPU.process);
                resetCpu(CPU);
                checkSuspended();
            }

            // Se o processo chegou no quantum
            else if (CPU.quantumCounter == 2) {

                //if (infoMode) Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index + 1} em razão do quantum em t = ${timePast}.`);
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${timePast}.`);
                CPU.process.state = "pronto";

                // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
                if (CPU.lastQueue == 1) ready2.push(CPU.process);
                else if (CPU.lastQueue == 2 || CPU.lastQueue == 3) ready3.push(CPU.process);
                resetCpu(CPU);
            }

            // Se o processo continua em execução
            else {
                CPU.process.remainingTime -= 1;

                // Impede que o processo de tempo real sofra interrupção por fatia de tempo
                if (CPU.process.priority == 1) CPU.quantumCounter += 1;
            }
        }

        // Se não tem processo na CPU e ainda tem processos na fila de prioridade
        // Tratar essa repetição de código mais tarde (dois ifs do priority)
        if (priorityQueue.length > 0) {

            // Se não tem processo na CPU
            if (!CPU.process) {
                CPU.process = priorityQueue.shift();
                CPU.lastQueue = 0;
                CPU.output.innerHTML = CPU.process.name;
                CPU.quantumCounter = 1;
                CPU.process.remainingTime -= 1;
                //if (infoMode) (`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index + 1} em t = ${timePast}.`);
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado de "Executando" em t = ${timePast}.`)
            }

            // Se tem processo na CPU e a prioridade dele é inferior
            else if (CPU.process && CPU.process.priority == 1) {
                //if (infoMode) Interface.log(`O processo ${CPU.process.name} liberou a CPU ${index + 1} em função da chegada do processo ${priorityQueue[0].name} de maior prioridade em t = ${timePast}.`);
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${timePast}.`);

                CPU.process.state = "pronto";

                // Enviando o processo pra lista n+1 (sendo n a lista de onde ele veio)
                if (CPU.lastQueue == 1) ready2.push(CPU.process);
                else if (CPU.lastQueue == 2 || CPU.lastQueue == 3) ready3.push(CPU.process);
                resetCpu(CPU);

                CPU.process = priorityQueue.shift();
                CPU.lastQueue = 0;
                CPU.output.innerHTML = CPU.process.name;
                CPU.quantumCounter = 1;
                CPU.process.remainingTime -= 1;
                //if (infoMode) Interface.log(`O processo ${CPU.process.name} chegou da fila de prioridade na CPU ${index + 1} em t = ${timePast}.`);
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${timePast}.`);
                CPU.process.state = "executando";
            }
        }

        // Se não tem processo na CPU e ainda tem processos nas filas de pronto
        else if (CPU.process == undefined && (ready1.length > 0 || ready2.length > 0 || ready3.length > 0)) {

            // Escolhendo a fila e salvando a informação dela na CPU
            if (ready1.length > 0) {
                CPU.process = ready1.shift();
                CPU.lastQueue = 1;
            }
            else if (ready2.length > 0) {
                CPU.process = ready2.shift();
                CPU.lastQueue = 2;
            }
            else {
                CPU.process = ready3.shift();
                CPU.lastQueue = 3;
            }

            // Alterando o output da CPU
            CPU.output.innerHTML = CPU.process.name;

            // Inicializando/atualizando os contadores do processo que chegou
            CPU.quantumCounter = 1;
            CPU.process.remainingTime -= 1;

            //if (infoMode) Interface.log(`O processo ${CPU.process.name} chegou da fila ${CPU.lastQueue} de prontos na CPU ${index + 1} em t = ${timePast}.`);
            Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${timePast}.`);

        }
    });
}

// Restaura a CPU para as configurações iniciais
function resetCpu(cpu) {
    cpu.process = undefined;
    cpu.quantumCounter = 0;
    cpu.output.innerHTML = '';
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
        if (type == 0) {
            let text = document.createElement('span');
            text.textContent = `P${mBlock.process}`;
            box.appendChild(text);
        }
        if (type == 1) {
            box.style.backgroundColor = '#ccc';
            box.style.border = 'none';
        }
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

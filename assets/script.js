const fileInput = document.getElementById('file');
const timer = document.getElementById('timer');

var CPUs = [
    new Cpu(document.querySelector('#cpu1')),
    new Cpu(document.querySelector('#cpu2')),
    new Cpu(document.querySelector('#cpu3')),
    new Cpu(document.querySelector('#cpu4')),
]

var tempoDecorrido = 0;
var processos = [];
var processosFinalizados = [];
var memoriaLivre = [
    {
        start: 0,
        size: 16384
    }];
var memoriaOcupada = [];
var suspenso = [];
var suspensoBloqueado = [];
var suspensoPrioridade = [];
var bloqueado = [];
var ready1 = [];
var ready2 = [];
var ready3 = [];
var priorityQueue = [];

fileInput.addEventListener('change', function () {
    var fr = new FileReader();
    fr.onload = function () {
        fillProcesses(fr.result);
    }

    fr.readAsText(this.files[0]);
});

function fillProcesses(text) {
    processos = text.split('\n').filter((e) => e.length >= 5);

    for (i = 0; i < processos.length; i++) {
        processos[i] = processos[i].replaceAll(' ', '');
        processos[i] = processos[i].split(',');
    }
    processos.sort((a, b) => {
        return parseInt(a[0]) - parseInt(b[0]);
    });

    for (i = 0; i < processos.length; i++) {
        processos[i] = new Process(i, processos[i][0], processos[i][1], processos[i][2], processos[i][3], processos[i][5]);
    }
}

function start() {

    // Define quantos segundos o loop do simulador vai durar
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
    if (ready1.length == 0 && ready2.length == 0 && ready3.length == 0 && processos.length == 0 && bloqueado.length == 0 && suspensoBloqueado.length == 0 && suspenso.length == 0 && !CPUs[0].process && !CPUs[1].process && !CPUs[2].process && !CPUs[3].process) {
        Interface.log(`A simulação terminou em t = ${tempoDecorrido}.`);
        clearInterval(simulationLoop);
    }
}
function checkSuspended() {
    let swapped = true;

    while (suspensoPrioridade.length > 0 && swapped == true) {
        swapped = allocateProcess(suspensoPrioridade[0]);
        if (swapped) {
            Interface.log(`O processo ${suspensoPrioridade[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${tempoDecorrido}.`);
            suspensoPrioridade[0].state = 'pronto';
            priorityQueue.push(suspensoPrioridade[0]);
            suspensoPrioridade.shift();
        }
    }

    while (suspenso.length > 0 && swapped == true) {
        swapped = allocateProcess(suspenso[0]);
        if (swapped) {
            Interface.log(`O processo ${suspenso[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${tempoDecorrido}.`);
            suspenso[0].state = 'pronto';
            ready1.push(suspenso[0]);
            suspenso.shift();
        }
    }

    while (suspensoBloqueado.length > 0 && swapped == true) {
        swapped = allocateProcess(suspensoBloqueado[0]);
        if (swapped) {
            Interface.log(`O processo ${suspenso[0].name} saiu do estado de "Suspenso" para o estado "Pronto" em t = ${tempoDecorrido}.`);
            suspensoBloqueado[0].state = 'pronto';
            ready1.push(suspensoBloqueado[0]);
            suspensoBloqueado.shift();
        }
    }
}
function allocateProcess(process) {
    let empty = -1;

    // Buscando espaço na memória
    for (i = 0; i < memoriaLivre.length; i++) {
        if (memoriaLivre[i].size >= process.size) {
            empty = i;
            break;
        }
    }

    if (empty == -1) return false;

    // Adicionando novo bloco de memória 
    memoriaOcupada.push({
        process: process.id,
        start: memoriaLivre[empty].start,
        size: process.size
    });

    // Atualiza a lista de blocos livres
    if (memoriaLivre[empty].size == process.size) {
        memoriaLivre = memoriaLivre.filter(e => memoriaLivre.indexOf(e) != empty);
    }
    else {
        memoriaLivre[empty].size -= process.size;
        memoriaLivre[empty].start += process.size;
    }

    return true;
}

// Desaloca um processo da memória e atualiza a lista de blocos livres
function deallocateProcess(process) {

    let deallocated = 0;

    // Percorrendo a lista de blocos ocupados até achar o processo
    let index;
    for (i = 0; i < memoriaOcupada.length; i++) {
        if (process.id == memoriaOcupada[i].process) {
            index = i;
            break;
        }
    }

    // Percorre lista de blocos ocupados para formar o novo bloco
    for (i = 0; i < memoriaLivre.length; i++) {

        // Se o bloco de ocupado está logo antes de um bloco livre
        if (memoriaLivre[i].start - memoriaOcupada[index].size == memoriaOcupada[index].start) {
            memoriaLivre[i].start = memoriaOcupada[index].start;
            memoriaLivre[i].size += memoriaOcupada[index].size;
            memoriaOcupada = memoriaOcupada.filter(e => memoriaOcupada.indexOf(e) != index);
            deallocated = 1;
            break;
        }

        // Se o bloco de ocupado está logo depois do bloco livre
        else if (memoriaLivre[i].start + memoriaLivre[i].size == memoriaOcupada[index].start) {
            memoriaLivre[i].size += memoriaOcupada[index].size;
            memoriaOcupada = memoriaOcupada.filter(e => memoriaOcupada.indexOf(e) != index);
            deallocated = 1;
            break;
        }
    }

    // Se bloco de memória não tem vizinhos livres, cria-se um novo bloco de livres
    if (!deallocated) {
        memoriaLivre.push({
            start: memoriaOcupada[index].start,
            size: memoriaOcupada[index].size
        });
        memoriaOcupada = memoriaOcupada.filter(e => memoriaOcupada.indexOf(e) != index);
    }

    // Ordena lista de livres pelo endereço do começo do bloco
    memoriaLivre.sort((a, b) => {
        return a.start - b.start;
    });

    // Busca blocos seguidos de livres que podem surgir
    if (memoriaLivre.length > 1) {
        for (i = 0; i < memoriaLivre.length - 1; i++) {
            if (memoriaLivre[i].start + memoriaLivre[i].size == memoriaLivre[i + 1].start) {
                memoriaLivre[i].size += memoriaLivre[i + 1].size;
                memoriaLivre = memoriaLivre.filter((e, j) => j != i + 1);
                break;
            };
        }
    }
}

function checkProcesses() {
    while (processos.length > 0 && processos[0].arrivalTime <= tempoDecorrido) {

        // Adicionando novo processo na memória
        allocated = allocateProcess(processos[0]);

        // Se não foi possível alocar o processo (prioridade 1) ele é enviado para a lista de suspensos
        if (!allocated && processos[0].priority == 1) {
            processos[0].state = "suspenso";
            Interface.log(`O processo ${processos[0].name} saiu do estado "Novo" e foi para o estado de "Suspenso" em t = ${tempoDecorrido}`)
            suspenso.push(processos[0]);
        }

        // Se não foi possivel alocar o processo (prioridade 0) é realizada uma troca
        else if (!allocated && processos[0].priority == 0) {
            if (!prioritySwap(processos[0])) {
                if (!brutePrioridadeSwap(processos[0])) {
                    Interface.log(`O processo ${processos[0].name} saiu do estado "Novo" para "Suspenso".`);
                    suspensoPrioridade.push(processos[0]);
                }
            }

        }

        // Se o processo foi alocado com sucesso, determina a fila para onde ele vai baseado em sua prioridade
        else {
            processos[0].state = "pronto";
            Interface.log(`O processo ${processos[0].name} saiu do estado "Novo" e foi para o estado de "Pronto" em t = ${tempoDecorrido}.`);

            if (processos[0].priority == 0) {
                priorityQueue.push(processos[0]);
            }
            else {
                ready1.push(processos[0]);
            }
        }

        // Retira o processo da lista de processos a serem alocados
        processos.shift();
    }
}

// Busca algum processo de prioridade 1 nas filas para fazer Swapping out e dar espaço ao novo processo de prioridade 0
function prioritySwap(process) {

    let queues = [bloqueado, ready3, ready2, ready1];

    // Percorrendo as filas em busca de um processo para fazer swapping-out
    for (z = 0; z < queues.length; z++) {
        for (j = 0; j < queues[z].length; j++) {

            // Se o processo encontrado tem tamanho maior que o que queremos alocar ele é retirado de memória
            if (queues[z][j].size >= process.size) {

                // Se o processo está bloqueado deve ir para a fila de bloqueados-suspensos
                if (z == 0) {
                    Interface.log(`O processo ${queues[z][j].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${tempoDecorrido}`);
                    suspensoBloqueado.push(queues[z][j]);
                    queues[z][j].state = "bloqueado/suspenso";
                }
                // Caso o processo não esteja bloqueado, vai para a fila de suspensos
                else {
                    Interface.log(`O processo ${queues[z][j].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${tempoDecorrido}`);
                    suspenso.push(queues[z][j]);
                    queues[z][j].state = "suspenso";
                }

                deallocateProcess(queues[z][j]);
                Interface.log(`O processo ${processos[0].name} saiu de "Novo" para "Pronto" em t = ${tempoDecorrido}.`);
                process.state = 'pronto';
                priorityQueue.push(process);

                // Removendo o processo da memória
                switch (z) {
                    case 0:
                        bloqueado = bloqueado.filter(e => bloqueado.indexOf(e) != j);
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
function brutePrioridadeSwap(process) {
    let queues = [bloqueado, ready3, ready2, ready1];

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
            Interface.log(`O processo ${bloqueado[0].name} saiu do estado "Bloqueado" para o estado "Bloqueado/Suspenso" em t = ${tempoDecorrido}`);
            suspensoBloqueado.push(queues[q][0]);
            queues[q][0].state = 'bloqueado/suspenso';
        }
        else {
            Interface.log(`O processo ${queues[q][0].name} saiu do estado "Pronto" para o estado "Suspenso" em t = ${tempoDecorrido}`);
            suspenso.push(queues[q][0]);
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

        Interface.log(`O processo ${CPUs[i].process.name} saiu do estado "Executando" para o estado "Suspenso" em t = ${tempoDecorrido}.`);
        CPUs[i].process.state = "suspenso";

        suspenso.push(CPUs[i].process);
        deallocateProcess(CPUs[i].process);
        resetCpu(CPUs[i]);

        allocated = allocateProcess(process);
    }

    if (allocated) {
        Interface.log(`O processo ${processos[0].name} saiu de "Novo" para "Pronto" em t = ${tempoDecorrido}.`);
        process.state = 'pronto';
        priorityQueue.push(process);
        return true;
    }
    return false;
}
// Atualiza o timer
function updateTimer() {
    timer.textContent = `Tempo: ${tempoDecorrido}`;
    tempoDecorrido += 1;
}


// Escalonador de processos
function updateCPUs() {

    // Percorrendo todas as CPUs
    CPUs.forEach((CPU, index) => {
        // Se tem processo ocupando a CPU
        if (CPU.process) {

            // Se o processo chegou ao final de sua execução
            if (CPU.process.remainingTime <= 0) {
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Finalizado" em t = ${tempoDecorrido}.`);
                CPU.process.state = "finalizado";
                CPU.process.endTime = tempoDecorrido;
                deallocateProcess(CPU.process);
                processosFinalizados.push(CPU.process);
                resetCpu(CPU);
                checkSuspended();
            }

            // Se o processo chegou no quantum
            else if (CPU.quantumCounter == 2) {

                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${tempoDecorrido}.`);
                CPU.process.state = "pronto";

                // Envia o processo pra lista n+1 (sendo n a lista de onde ele veio)
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
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado de "Executando" em t = ${tempoDecorrido}.`)
            }

            // Se tem processo na CPU e a prioridade dele é inferior
            else if (CPU.process && CPU.process.priority == 1) {
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Executando" para o estado "Pronto" em t = ${tempoDecorrido}.`);

                CPU.process.state = "pronto";

                // Envia o processo pra lista n+1 (n sendo a lista de onde ele veio)
                if (CPU.lastQueue == 1) ready2.push(CPU.process);
                else if (CPU.lastQueue == 2 || CPU.lastQueue == 3) ready3.push(CPU.process);
                resetCpu(CPU);

                CPU.process = priorityQueue.shift();
                CPU.lastQueue = 0;
                CPU.output.innerHTML = CPU.process.name;
                CPU.quantumCounter = 1;
                CPU.process.remainingTime -= 1;
                Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${tempoDecorrido}.`);
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

            Interface.log(`O processo ${CPU.process.name} saiu do estado "Pronto" para o estado "Executando" em t = ${tempoDecorrido}.`);

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
    outputP: document.getElementById('processosOutput'),
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
    outputPQ: document.getElementById('prioridade'),
    outputR1Q: document.getElementById('ready1'),
    outputR2Q: document.getElementById('ready2'),
    outputR3Q: document.getElementById('ready3'),
    outputBQ: document.getElementById('bloqueado'),
    outputSQ: document.getElementById('suspenso'),
    outputSPQ: document.getElementById('suspenso-prioridade'),
    outputSBQ: document.getElementById('suspenso-bloqueado'),
    updateQueues: function () {
        Interface._updateQueue(priorityQueue, Interface.outputPQ);
        Interface._updateQueue(ready1, Interface.outputR1Q);
        Interface._updateQueue(ready2, Interface.outputR2Q);
        Interface._updateQueue(ready3, Interface.outputR3Q);
        Interface._updateQueue(suspenso, Interface.outputSQ);
        Interface._updateQueue(suspensoPrioridade, Interface.outputSPQ);
        Interface._updateQueue(bloqueado, Interface.outputBQ);
        Interface._updateQueue(suspensoBloqueado, Interface.outputSBQ);
    },
    
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
        memoriaOcupada.forEach(mBlock => {
            Interface._createBlock(mBlock, 0);
        });
        memoriaLivre.forEach(mBlock => {
            Interface._createBlock(mBlock, 1);
        });
    }
};

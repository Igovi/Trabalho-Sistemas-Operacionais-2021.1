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
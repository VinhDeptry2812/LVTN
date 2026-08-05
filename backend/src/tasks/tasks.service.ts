import { Injectable } from '@nestjs/common';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
}

@Injectable()
export class TasksService {

   private tasks: Task[] = [
    {
        id: 1,
        title: "Task 1",
        description: "Description 1",
        status: "TODO",
    },
    {
        id: 2,
        title: "Task 2",
        description: "Description 2",
        status: "TODO",
    },
    {
        id: 3,
        title: "Task 3",
        description: "Description 3",
        status: "TODO",
    },
   ];

   getALLtask(): Task[]{
    return this.tasks;
   }

   createTask(title: string, description: string, status: string):Task{
    const newTask: Task={
        id: Date.now(),
        title,
        description,
        status
    };
    this.tasks.push(newTask);
    return newTask;
   }

   deleteTasl(id:number): boolean{
    const initialLength= this.tasks.length;
    this.tasks =this.tasks.filter((task)=>task.id !== id);
    return this.tasks.length < initialLength;
   }
    

}

Vue.component('tasks', {
    props: ['list'],
    template: '#tasks-template',
    computed: {
        remaining: function(){
            return this.list.filter(this.inProgress).length;
        }
    },
    methods: {
        isCompleted: function(task) {
            return task.completed
        },
        inProgress: function(task) {
            return !this.isCompleted(task);
            
        },
        deleteTask: function(task) {
            this.list.$delete(task);
        }
    }
})
new Vue({
    el: '#app',
    data: {
        tasks: [
            { body: 'Go to the store', completed: false },
            { body:'Go to the bank', completed: false },
            { body:'Go to the doctor', completed: true }
        ]
    }
})
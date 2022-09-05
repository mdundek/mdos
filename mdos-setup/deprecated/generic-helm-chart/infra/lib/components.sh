#!/bin/bash

c_reset=""
c_cyan=""
c_grey=""

if [ ! -z $TERM ] && [ "$TERM" != "dumb" ]; then
    command -v tput &> /dev/null || NO_TPUT=1
    if [ -z $NO_TPUT ]; then
        c_reset=$(tput sgr0)
        c_cyan=$(tput setaf 6)
        c_grey=$(tput setaf 243)
    fi
fi

# #############################
# MULTISELECT
# #############################
prompt_for_multiselect() {
    MANDATORY="$3"
    # little helpers for terminal print control and key input
    ESC=$( printf "\033")
    cursor_blink_on()   { printf "$ESC[?25h"; }
    cursor_blink_off()  { printf "$ESC[?25l"; }
    cursor_to()         { printf "$ESC[$1;${2:-1}H"; }
    print_inactive()    { printf "$2   $1 "; }
    print_active()      { printf "$2  $ESC[7m $1 $ESC[27m"; }
    get_cursor_row()    { IFS=';' read -sdR -p $'\E[6n' ROW COL; echo ${ROW#*[}; }
    key_input()         {
		local key
		IFS= read -rsn1 key 2>/dev/null >&2
		if [[ $key = ""      ]]; then echo enter; fi;
		if [[ $key = $'\x20' ]]; then echo space; fi;
		if [[ $key = $'\x1b' ]]; then
			read -rsn2 key
			if [[ $key = [A ]]; then echo up;    fi;
			if [[ $key = [B ]]; then echo down;  fi;
		fi 
    }
    toggle_option()    {
		local arr_name=$1
		eval "local arr=(\"\${${arr_name}[@]}\")"
		local option=$2
		if [[ ${arr[option]} == true ]]; then
			arr[option]=
		else
			arr[option]=true
		fi
		eval $arr_name='("${arr[@]}")'
    }

    local retval=$1
    local options
    local defaults

    IFS=';' read -r -a options <<< "$2"
    if [[ -z $3 ]]; then
      	defaults=()
    else
      	IFS=';' read -r -a defaults <<< "$3"
    fi
    local selected=()

    for ((i=0; i<${#options[@]}; i++)); do
		selected+=("${defaults[i]:-false}")
		printf "\n"
    done

    # determine current screen position for overwriting the options
    local lastrow=`get_cursor_row`
    local startrow=$(($lastrow - ${#options[@]}))

    # ensure cursor and input echoing back on upon a ctrl+c during read -s
    trap "cursor_blink_on; stty echo; printf '\n'; exit" 2
    cursor_blink_off

    local active=0
    while true; do
        # print options by overwriting the last lines
        local idx=0
        for option in "${options[@]}"; do
            local prefix="[ ]"
            if [[ ${selected[idx]} == true ]]; then
              	prefix="[x]"
            fi

            cursor_to $(($startrow + $idx))
            if [ $idx -eq $active ]; then
                print_active "$option" "$prefix"
            else
                print_inactive "$option" "$prefix"
            fi
            ((idx++))
        done

        # user key control
        case `key_input` in
            space)  toggle_option selected $active;;
            enter)
				if [ "$MANDATORY" == "" ]; then
					break
				else
					HAS_ONE=""
					for i in "${!selected[@]}"; do
						if [ "${selected[$i]}" == "true" ]; then
							HAS_ONE=1
						fi
					done
					if [ ! -z $HAS_ONE ]; then
						break
					fi
				fi
				;;
            up)
				((active--));
                if [ $active -lt 0 ]; then active=$((${#options[@]} - 1)); fi
				;;
            down)
				((active++));
                if [ $active -ge ${#options[@]} ]; then active=0; fi
				;;
        esac
    done

    # cursor position back to normal
    cursor_to $lastrow
    printf "\n"
    cursor_blink_on

    eval $retval='("${selected[@]}")'
}

# #############################
# SELECT
# #############################
prompt_for_select() {
    # little helpers for terminal print control and key input
    ESC=$( printf "\033")
    cursor_blink_on()   { printf "$ESC[?25h"; }
    cursor_blink_off()  { printf "$ESC[?25l"; }
    cursor_to()         { printf "$ESC[$1;${2:-1}H"; }
    print_inactive()    { printf "$2   $1 "; }
    print_active()      { printf "$2  $ESC[7m $1 $ESC[27m"; }
    get_cursor_row()    { IFS=';' read -sdR -p $'\E[6n' ROW COL; echo ${ROW#*[}; }
    key_input()         {
		local key
		IFS= read -rsn1 key 2>/dev/null >&2
		if [[ $key = ""      ]]; then echo enter; fi;
		if [[ $key = $'\x20' ]]; then echo space; fi;
		if [[ $key = $'\x1b' ]]; then
			read -rsn2 key
			if [[ $key = [A ]]; then echo up;    fi;
			if [[ $key = [B ]]; then echo down;  fi;
		fi 
    }
    toggle_option()    {
		local arr_name=$1
		eval "local arr=(\"\${${arr_name}[@]}\")"
		local option=$2
		if [[ ${arr[option]} == true ]]; then
			arr[option]=
		else
			arr[option]=true
		fi
		eval $arr_name='("${arr[@]}")'
    }

    local retval=$1
    local options
    local defaults

    IFS=';' read -r -a options <<< "$2"
    if [[ -z $3 ]]; then
      	defaults=()
    else
      	IFS=';' read -r -a defaults <<< "$3"
    fi
    local selected=()

    for ((i=0; i<${#options[@]}; i++)); do
		selected+=("${defaults[i]:-false}")
		printf "\n"
    done

    # determine current screen position for overwriting the options
    local lastrow=`get_cursor_row`
    local startrow=$(($lastrow - ${#options[@]}))

    # ensure cursor and input echoing back on upon a ctrl+c during read -s
    trap "cursor_blink_on; stty echo; printf '\n'; exit" 2
    cursor_blink_off

    local active=0
    while true; do
        # print options by overwriting the last lines
        local idx=0
        for option in "${options[@]}"; do
            local prefix=">"
            cursor_to $(($startrow + $idx))
            if [ $idx -eq $active ]; then
                print_active "$option" "$prefix"
            else
                print_inactive "$option" "$prefix"
            fi
            ((idx++))
        done

        # user key control
        case `key_input` in
            enter)
				toggle_option selected $active 
				break
				;;
            up)
				((active--));
                if [ $active -lt 0 ]; then active=$((${#options[@]} - 1)); fi
				;;
            down)
				((active++));
                if [ $active -ge ${#options[@]} ]; then active=0; fi
				;;
        esac
    done

    # cursor position back to normal
    cursor_to $lastrow
    printf "\n"
    cursor_blink_on

    eval $retval='("${selected[@]}")'
}

# #############################
# SELECT REPOS
# #############################
select_repos() {
    local __resultvar=$1
    local SELECTED=()
    local CHECKED_REPOS=()

    OPTIONS_VALUES=("ms" "okube" "cc" "helm-chart")
    OPTIONS_LABELS=("Sync & Deploy Job Microservice" "Okube API" "Control Center" "Generic Helm Chart")

	shift
	IS_MANDATORY=""
	while [ "$1" != "" ]; do
		case $1 in
			--include-stack-chart )
				OPTIONS_VALUES+=("stack")
				OPTIONS_LABELS+=("OSP Stack Helm Chart")
			;;
			--mandatory )
				IS_MANDATORY=1
			;;
            --set-e )
				SET_E=1
			;;
		esac
		shift
	done

    OPTIONS_STRING=""
    for i in "${!OPTIONS_VALUES[@]}"; do
        OPTIONS_STRING+="${OPTIONS_VALUES[$i]} (${OPTIONS_LABELS[$i]});"
    done
    question "Select the target repos (select with space, enter when done):"
    if [ ! -z $SET_E ]; then set +Ee; fi
    prompt_for_multiselect SELECTED "$OPTIONS_STRING" $IS_MANDATORY
    if [ ! -z $SET_E ]; then set -Ee; fi
    for i in "${!SELECTED[@]}"; do
        if [ "${SELECTED[$i]}" == "true" ]; then
            CHECKED_REPOS+=("${OPTIONS_VALUES[$i]}")
        fi
    done
    eval $__resultvar='("${CHECKED_REPOS[@]}")'
}

# #############################
# SELECT COMPONENTS
# #############################
select_components() {
    local __resultvar=$1
    local SELECTED=()
    local CHECKED_COMP=()

    OPTIONS_VALUES=("sync" "deploy" "okube" "cc")
    OPTIONS_LABELS=("Sync Job Microservice" "Deploy Job Microservice" "Okube API" "Control Center")

	shift
	IS_MANDATORY=""
	while [ "$1" != "" ]; do
		case $1 in
			--mandatory )
				IS_MANDATORY=1
			;;
            --set-e )
				SET_E=1
			;;
		esac
		shift
	done

    OPTIONS_STRING=""
    for i in "${!OPTIONS_VALUES[@]}"; do
        OPTIONS_STRING+="${OPTIONS_VALUES[$i]} (${OPTIONS_LABELS[$i]});"
    done
    question "Select the target components (select with space, enter when done):"
    if [ ! -z $SET_E ]; then set +Ee; fi
    prompt_for_multiselect SELECTED "$OPTIONS_STRING" $IS_MANDATORY
    if [ ! -z $SET_E ]; then set -Ee; fi
    for i in "${!SELECTED[@]}"; do
        if [ "${SELECTED[$i]}" == "true" ]; then
            CHECKED_COMP+=("${OPTIONS_VALUES[$i]}")
        fi
    done
    eval $__resultvar='("${CHECKED_COMP[@]}")'
}

# #############################
# SELECT ONE REPO
# #############################
select_one_repo() {
    local __resultvar=$1
    OPTIONS_VALUES=("ms" "okube" "cc" "helm-chart")
    OPTIONS_LABELS=("Sync & Deploy Job Microservice" "Okube API" "Control Center" "Generic Helm Chart")

	shift
	IS_MANDATORY=""
	while [ "$1" != "" ]; do
		case $1 in
			--include-stack-chart )
				OPTIONS_VALUES+=("stack")
				OPTIONS_LABELS+=("OSP Stack Helm Chart")
			;;
            --set-e )
				SET_E=1
			;;
		esac
		shift
	done

    OPTIONS_STRING=""
    for i in "${!OPTIONS_VALUES[@]}"; do
        OPTIONS_STRING+="${OPTIONS_VALUES[$i]} (${OPTIONS_LABELS[$i]});"
    done

    question "Select the target repos:"
    if [ ! -z $SET_E ]; then set +Ee; fi
    prompt_for_select SELECTED "$OPTIONS_STRING"
    if [ ! -z $SET_E ]; then set -Ee; fi
    for i in "${!SELECTED[@]}"; do
        if [ "${SELECTED[$i]}" == "true" ]; then
            eval $__resultvar="'${OPTIONS_VALUES[$i]}'"
        fi
    done
}

# #############################
# USER INPUT
# #############################
user_input() {
    local  __resultvar=$1

    _Q="${c_cyan}$2${c_reset} "
    if [ ! -z $3 ]; then
        _Q="$_Q${c_grey}($3)${c_reset} "
    fi

    read -p "$_Q" inputval
    if [ "$3" == "" ]; then
        while [ "$inputval" == "" ]; do
            read -p "Value required, try again: " inputval
        done
    else
        if [ "$inputval" == "" ]; then
            inputval="$3"
        fi
    fi
    
    eval $__resultvar="'$inputval'"
	echo ""
}

# #############################
# YES_NO
# #############################
yes_no() {
    local  __resultvar=$1
    OPTIONS_STRING=("Yes;No;")
    question "$2"
    if [ ! -z $3 ]; then set +Ee; fi
    prompt_for_select SELECTED "$OPTIONS_STRING"
    if [ ! -z $3 ]; then set -Ee; fi
    for i in "${!SELECTED[@]}"; do
        if [ "${SELECTED[$i]}" == "true" ]; then
          	if [ "$i" == "0" ]; then eval $__resultvar="yes"; else eval $__resultvar="no"; fi
        fi
    done
}